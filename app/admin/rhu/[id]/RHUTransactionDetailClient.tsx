"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, CheckCircle2, XCircle, Printer,
    Activity, Stethoscope, ClipboardList,
    ZoomIn, ZoomOut, RotateCw, Eye, AlertTriangle,
    Search, Pill, Clock, UserCheck, ShieldAlert,
    Syringe, FileText, Building
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRHUAppointmentStatus, getRHUHealthCenters } from "../actions";
import { getRHUInventoryItems, dispenseRHUMedicines } from "@/app/admin/rhu/inventory/actions";
import PrintReferralSlip from "@/components/shared/PrintReferralSlip";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function calculateBMI(heightCm?: string | number, weightKg?: string | number) {
    const h = parseFloat(String(heightCm || ""));
    const w = parseFloat(String(weightKg || ""));
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightM = h / 100;
    const bmiVal = w / (heightM * heightM);
    const bmiStr = bmiVal.toFixed(1);

    let category = "Normal weight";
    let badgeClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (bmiVal < 18.5) {
        category = "Underweight";
        badgeClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (bmiVal <= 24.9) {
        category = "Normal weight";
        badgeClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (bmiVal <= 29.9) {
        category = "Overweight";
        badgeClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";
    } else {
        category = "Obese";
        badgeClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }
    return { bmi: bmiStr, category, badgeClass };
}

function evaluateTemperature(temp?: string | number) {
    const t = parseFloat(String(temp || ""));
    if (isNaN(t) || t <= 0) return null;
    if (t < 36.5) return { category: "Low Temp", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (t <= 37.5) return { category: "Normal Temp", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (t <= 37.9) return { category: "Low Fever", isCritical: false, isWarning: true, badgeClass: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return { category: "High Fever ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse" };
}

function evaluateBloodPressure(bpStr?: string, sysStr?: string | number, diaStr?: string | number) {
    let sys = parseFloat(String(sysStr || ""));
    let dia = parseFloat(String(diaStr || ""));
    if ((isNaN(sys) || isNaN(dia)) && bpStr && bpStr.includes("/")) {
        const parts = bpStr.split("/");
        sys = parseFloat(parts[0]);
        dia = parseFloat(parts[1]);
    }
    if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) return null;

    if (sys > 180 || dia > 120) return { category: "Crisis 🚨", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/20 border-rose-500/50 animate-pulse" };
    if (sys >= 140 || dia >= 90) return { category: "Stage 2 HTN ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/15 border-rose-500/30" };
    if (sys >= 130 || dia >= 80) return { category: "Stage 1 HTN", isCritical: false, isWarning: true, badgeClass: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    if (sys >= 120 && dia < 80) return { category: "Elevated BP", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { category: "Normal BP", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

function evaluatePulseRate(pulse?: string | number) {
    const p = parseFloat(String(pulse || ""));
    if (isNaN(p) || p <= 0) return null;
    if (p < 60) return { category: "Bradycardia", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (p <= 100) return { category: "Normal Rate", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    return { category: "Tachycardia ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/15 border-rose-500/30" };
}


function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getAdditionalData(tx: any): any {
    if (!tx?.additionalData) return {};
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

function isExpiredDate(dateStrOrObj?: string | Date | null): boolean {
    if (!dateStrOrObj) return false;
    const exp = new Date(dateStrOrObj);
    if (isNaN(exp.getTime())) return false;
    exp.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
}

function getUnexpiredStock(item: any): number {
    if (!item) return 0;

    if (item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
        return item.batches.reduce((sum: number, b: any) => {
            const qty = b.quantity || 0;
            if (qty <= 0) return sum;
            if (b.expirationDate && isExpiredDate(b.expirationDate)) return sum;
            return sum + qty;
        }, 0);
    }

    if (item.expirationDate && isExpiredDate(item.expirationDate)) {
        return 0;
    }

    return item.quantity || 0;
}

function formatExpiryDate(expDate?: string | Date | null): { text: string; isExpired: boolean; isExpiringSoon: boolean } {
    if (!expDate) return { text: "N/A", isExpired: false, isExpiringSoon: false };
    const exp = new Date(expDate);
    if (isNaN(exp.getTime())) return { text: "N/A", isExpired: false, isExpiringSoon: false };

    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = exp.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

    if (diffDays <= 0) {
        return { text: `${formatted} (Expired)`, isExpired: true, isExpiringSoon: false };
    }
    if (diffDays <= 60) {
        return { text: `${formatted} (${diffDays}d left)`, isExpired: false, isExpiringSoon: true };
    }
    return { text: formatted, isExpired: false, isExpiringSoon: false };
}

function getItemDisplayExpiry(item: any): { text: string; isExpired: boolean; isExpiringSoon: boolean } {
    if (!item) return { text: "N/A", isExpired: false, isExpiringSoon: false };

    if (item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
        const unexpiredBatches = item.batches.filter((b: any) => {
            const qty = b.quantity || 0;
            return qty > 0 && b.expirationDate && !isExpiredDate(b.expirationDate);
        });

        if (unexpiredBatches.length > 0) {
            unexpiredBatches.sort((a: any, b: any) => {
                const dateA = new Date(a.expirationDate).getTime();
                const dateB = new Date(b.expirationDate).getTime();
                return dateA - dateB;
            });
            return formatExpiryDate(unexpiredBatches[0].expirationDate);
        }
    }

    return formatExpiryDate(item.expirationDate);
}

export default function RHUTransactionDetailClient({ transaction, currentUser }: { transaction: any; currentUser?: any }) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const resident = getResidentSnapshot(transaction);
    const addData = getAdditionalData(transaction);

    const userRole = currentUser?.role || "";
    const userEmail = (currentUser?.email || "").toLowerCase();
    const isPharmacyAccount = userRole === "ADMIN" || 
                              userRole === "RHU_ADMIN" || 
                              userRole === "RHU_PHARMACY" || 
                              userEmail.includes("pharmacy");

    // Cancel modal state
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelRemarks, setCancelRemarks] = useState("");

    // Referral modal state
    const [referralModalOpen, setReferralModalOpen] = useState(false);
    const [referralFacility, setReferralFacility] = useState(() => {
        return addData.referralFacility || "";
    });
    const [referralReason, setReferralReason] = useState(() => {
        return addData.referralReason || "";
    });
    const [hospitalSearchQuery, setHospitalSearchQuery] = useState("");
    const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false);
    const [healthCenters, setHealthCenters] = useState<any[]>([]);
    const [loadingCenters, setLoadingCenters] = useState(false);
    const [triggerPrintReferral, setTriggerPrintReferral] = useState(false);


    // Fetch health centers from DB when referral modal opens
    React.useEffect(() => {
        if (referralModalOpen && healthCenters.length === 0) {
            setLoadingCenters(true);
            getRHUHealthCenters()
                .then((res) => {
                    if (res.success && res.data) {
                        setHealthCenters(res.data);
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingCenters(false));
        }
    }, [referralModalOpen, healthCenters.length]);

    // Derive current appointment's health center to exclude from referral options
    const txAddData = (() => {
        if (!transaction?.additionalData) return {};
        if (typeof transaction.additionalData === "string") {
            try { return JSON.parse(transaction.additionalData); } catch { return {}; }
        }
        return transaction.additionalData;
    })();
    const currentCenterId = txAddData.healthCenterId || "";
    const currentCenterName = (txAddData.healthCenterName || "").toLowerCase();

    const filteredHospitals = healthCenters.filter(c => {
        // Exclude the current appointment's own center
        if (currentCenterId && c.id === currentCenterId) return false;
        if (currentCenterName && c.name.toLowerCase() === currentCenterName) return false;
        // Apply search query filter
        return c.name.toLowerCase().includes(hospitalSearchQuery.toLowerCase());
    });


    // Lightbox image viewer state
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [rotateAngle, setRotateAngle] = useState(0);

    // Patient Check-In (Vitals) modal state
    const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
    const [vitals, setVitals] = useState({
        height: "",
        weight: "",
        systolic: "",
        diastolic: "",
        temperature: "",
        pulseRate: "",
        philhealthNumber: "",
        konsultationNumber: "",
        recordedBy: currentUser?.name || "",
    });
    const [vitalsErrors, setVitalsErrors] = useState<Record<string, boolean>>({});
    const [confirmCheckInDialogOpen, setConfirmCheckInDialogOpen] = useState(false);

    // Doctor's Clinical Notes (DEOS) modal state
    const [deosModalOpen, setDeosModalOpen] = useState(false);
    const [deos, setDeos] = useState(() => ({
        diagnosis: addData.deos?.diagnosis || "",
        examinationFindings: addData.deos?.examinationFindings || "",
        orders: addData.deos?.orders || "",
        status: addData.deos?.status || "",
        attendingPhysician: addData.deos?.attendingPhysician || currentUser?.name || "",
    }));
    const [deosErrors, setDeosErrors] = useState<Record<string, boolean>>({});
    const [confirmDeosDialogOpen, setConfirmDeosDialogOpen] = useState(false);

    // Pharmacy Dispense Confirmation modal state
    const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
    const [confirmDispenseDialogOpen, setConfirmDispenseDialogOpen] = useState(false);
    const [confirmApprovePoDialogOpen, setConfirmApprovePoDialogOpen] = useState(false);
    const [dispenseItems, setDispenseItems] = useState<{ id: string; name: string; currentStock: number; unit: string; qtyToDispense: number | string }[]>([]);

    // Medicine catalog search state for prescription
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [medSearchQuery, setMedSearchQuery] = useState("");
    const [loadingInventory, setLoadingInventory] = useState(false);

    React.useEffect(() => {
        if ((deosModalOpen || dispenseModalOpen) && inventoryItems.length === 0) {
            setLoadingInventory(true);
            getRHUInventoryItems()
                .then((res) => {
                    if (res.success && res.data) {
                        setInventoryItems(res.data);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load inventory items:", err);
                })
                .finally(() => {
                    setLoadingInventory(false);
                });
        }
    }, [deosModalOpen, dispenseModalOpen, inventoryItems.length]);

    const filteredMeds = inventoryItems.filter((item) => {
        if (!medSearchQuery.trim()) return false;
        const q = medSearchQuery.toLowerCase();
        const name = (item.name || "").toLowerCase();
        const generic = (item.genericName || "").toLowerCase();
        const brand = (item.brandName || "").toLowerCase();
        return name.includes(q) || generic.includes(q) || brand.includes(q);
    });

    const handleAddMedicineToOrders = (item: any) => {
        const expInfo = getItemDisplayExpiry(item);
        const usableStock = getUnexpiredStock(item);
        const isOutOfStock = usableStock <= 0 || expInfo.isExpired;

        const rawDosage = (item.dosage || "").trim();
        const dosageFormatted = rawDosage
            ? (rawDosage.startsWith("(") ? ` ${rawDosage}` : ` (${rawDosage})`)
            : "";

        let medLine = "";
        if (isOutOfStock) {
            medLine = `• ${item.name}${dosageFormatted} [OUT OF STOCK - External Purchase Required]`;
        } else {
            medLine = `• ${item.name}${dosageFormatted}`;
        }

        setDeos(prev => {
            const currentOrders = prev.orders ? prev.orders.trim() : "";
            const updatedOrders = currentOrders ? `${currentOrders}\n${medLine}` : medLine;
            return { ...prev, orders: updatedOrders };
        });

        toast.success(`Added "${item.name}" to prescription orders.`);
    };

    // Vaccine batch encoder state
    const [vaccines, setVaccines] = useState(() => {
        if (addData.vaccines && Array.isArray(addData.vaccines) && addData.vaccines.length > 0) {
            return addData.vaccines;
        }
        return [{
            name: "", batchNumber: "", doseNumber: "", dateAdministered: "", site: ""
        }];
    });

    // Active console tab
    const [activeTab, setActiveTab] = useState<"deos" | "vaccine" | "rx">("deos");

    // Prescription / referral inline state
    const [rxText, setRxText] = useState(() => {
        return addData.rxText || "";
    });

    const patientName = resident.firstName
        ? `${resident.firstName} ${resident.middleName ? resident.middleName + ' ' : ''}${resident.lastName}`
        : transaction.user?.name || "N/A";

    const isPriority = addData.isPriorityLane;
    const checkupDisplay = addData.checkupType === "OTHER"
        ? addData.customCheckupType || "Custom Check-up"
        : addData.checkupType || transaction.type?.name || "General Consultation";

    // Attachments
    const attachments: string[] = [];
    if (addData.attachments && Array.isArray(addData.attachments)) {
        attachments.push(...addData.attachments);
    }
    if (addData.idPhotoUrl) attachments.push(addData.idPhotoUrl);
    if (addData.medicalRecordUrl) attachments.push(addData.medicalRecordUrl);
    if (transaction.attachments && Array.isArray(transaction.attachments)) {
        attachments.push(...transaction.attachments);
    }

    const handleUpdateStatus = async (
        newStatus: string,
        remarks?: string,
        refData?: { facility?: string; reason?: string },
        vitalsData?: typeof vitals,
        deosData?: typeof deos,
        extraData?: Record<string, any>
    ) => {
        setSubmitting(true);
        try {
            const res = await updateRHUAppointmentStatus(transaction.id, newStatus, remarks, refData, vitalsData, deosData, extraData);
            if (res.success) {
                toast.success(`Appointment status updated to ${newStatus.replace(/_/g, " ")}`);
                setCancelModalOpen(false);
                setReferralModalOpen(false);
                setVitalsModalOpen(false);
                setDeosModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenCheckInModal = () => {
        setVitals(p => ({
            ...p,
            recordedBy: p.recordedBy || currentUser?.name || ""
        }));
        setVitalsModalOpen(true);
    };

    const handleOpenDeosModal = () => {
        setDeos(p => ({
            ...p,
            attendingPhysician: p.attendingPhysician || currentUser?.name || ""
        }));
        setDeosModalOpen(true);
    };

    const handleConfirmCheckIn = () => {
        const errors: Record<string, boolean> = {};
        if (!vitals.height.trim()) errors.height = true;
        if (!vitals.weight.trim()) errors.weight = true;
        if (!vitals.systolic.trim()) errors.systolic = true;
        if (!vitals.diastolic.trim()) errors.diastolic = true;
        if (!vitals.temperature.trim()) errors.temperature = true;
        if (!vitals.pulseRate.trim()) errors.pulseRate = true;

        if (Object.keys(errors).length > 0) {
            setVitalsErrors(errors);
            toast.error("Please fill in all required vitals fields.");
            return;
        }
        setVitalsErrors({});
        setConfirmCheckInDialogOpen(true);
    };

    const executeCheckInSubmission = () => {
        setConfirmCheckInDialogOpen(false);
        const vitalsDataToSave = {
            ...vitals,
            recordedBy: currentUser?.name || "RHU Staff"
        };
        handleUpdateStatus("CHECK_IN", undefined, undefined, vitalsDataToSave);
    };

    const handleConfirmPrescription = () => {
        const errors: Record<string, boolean> = {};
        if (!deos.diagnosis.trim()) errors.diagnosis = true;
        if (!deos.examinationFindings.trim()) errors.examinationFindings = true;
        if (!deos.orders.trim()) errors.orders = true;
        if (Object.keys(errors).length > 0) {
            setDeosErrors(errors);
            toast.error("Please fill in all required clinical notes.");
            return;
        }
        setDeosErrors({});
        setConfirmDeosDialogOpen(true);
    };

    const executePrescriptionSubmission = () => {
        setConfirmDeosDialogOpen(false);
        const deosDataToSave = {
            ...deos,
            attendingPhysician: currentUser?.name || "Attending Physician"
        };
        
        const validVaccines = vaccines.filter((v: any) => v.name.trim() !== "");
        const extraData = {
            vaccines: validVaccines,
            rxText: rxText.trim()
        };

        const referralDataToSave = (referralFacility.trim() || referralReason.trim())
            ? { facility: referralFacility.trim(), reason: referralReason.trim() }
            : undefined;

        handleUpdateStatus("PRESCRIBED", undefined, referralDataToSave, undefined, deosDataToSave, extraData);
    };

    const autoPopulateDispenseItems = (items: any[]) => {
        const orderText = (addData.deos?.orders || addData.deos?.diagnosis || "").toLowerCase();
        const matched: { id: string; name: string; currentStock: number; unit: string; qtyToDispense: number | string }[] = [];
        
        if (orderText && items.length > 0) {
            items.forEach(inv => {
                const name = (inv.name || "").toLowerCase();
                const generic = (inv.genericName || "").toLowerCase();
                const brand = (inv.brandName || "").toLowerCase();
                
                if ((name && name.length > 2 && orderText.includes(name)) || 
                    (generic && generic.length > 3 && orderText.includes(generic)) ||
                    (brand && brand.length > 3 && orderText.includes(brand))) {
                    if (!matched.some(m => m.id === inv.id)) {
                        const availableStock = getUnexpiredStock(inv);
                        matched.push({
                            id: inv.id,
                            name: inv.name,
                            currentStock: availableStock,
                            unit: inv.unit || "pcs",
                            qtyToDispense: ""
                        });
                    }
                }
            });
        }
        setDispenseItems(matched);
    };

    const handleOpenDispenseModal = () => {
        setDispenseModalOpen(true);
        if (inventoryItems.length === 0) {
            getRHUInventoryItems().then(res => {
                if (res.success && res.data) {
                    setInventoryItems(res.data);
                    autoPopulateDispenseItems(res.data);
                }
            });
        } else {
            autoPopulateDispenseItems(inventoryItems);
        }
    };

    const handleConfirmDispenseAndComplete = () => {
        // Enforce non-expired stock validation
        const zeroStockItem = dispenseItems.find(i => i.currentStock <= 0);
        if (zeroStockItem) {
            toast.error(`Cannot dispense ${zeroStockItem.name}: item has no non-expired stock available in inventory.`);
            return;
        }

        // Enforce required quantity input validation
        const emptyItem = dispenseItems.find(i => !i.qtyToDispense || Number(i.qtyToDispense) <= 0);
        if (emptyItem) {
            toast.error(`Please enter a valid quantity to dispense for ${emptyItem.name}.`);
            return;
        }

        // Enforce stock limit validation
        const overStockItem = dispenseItems.find(i => Number(i.qtyToDispense) > i.currentStock);
        if (overStockItem) {
            toast.error(`Cannot dispense ${overStockItem.name}: requested quantity (${overStockItem.qtyToDispense}) exceeds available stock (${overStockItem.currentStock} ${overStockItem.unit}).`);
            return;
        }

        setConfirmDispenseDialogOpen(true);
    };

    const executeDispenseSubmission = async () => {
        setConfirmDispenseDialogOpen(false);
        setSubmitting(true);
        try {
            if (dispenseItems.length > 0) {
                const itemsToDeduct = dispenseItems.map(i => ({ itemId: i.id, quantity: Number(i.qtyToDispense) }));
                const dispRes = await dispenseRHUMedicines(itemsToDeduct);
                if (!dispRes.success) {
                    toast.error(dispRes.error || "Failed to deduct inventory stock.");
                }
            }

            const targetStatus = (userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "RHU_CENTER_ADMIN") ? "COMPLETED" : "PRESCRIBED";
            const dispensedItemsList = dispenseItems.map(i => ({
                name: i.name,
                quantity: Number(i.qtyToDispense),
                unit: i.unit || "pcs"
            }));
            const summaryText = dispensedItemsList.map(i => `• ${i.name} ${i.quantity} ${i.unit || 'pcs'}`).join("\n");

            const res = await updateRHUAppointmentStatus(
                transaction.id,
                targetStatus,
                "Medicine dispensed by RHU Pharmacy",
                undefined, undefined, undefined,
                {
                    dispensedAt: new Date().toISOString(),
                    dispenseInfo: {
                        dispensedBy: currentUser?.name || currentUser?.email || "RHU Pharmacy Staff",
                        dispensedByEmail: currentUser?.email || null,
                        dispensedByRole: userRole || "RHU_PHARMACY",
                        dispensedAt: new Date().toISOString(),
                        items: dispensedItemsList,
                        summaryText: summaryText
                    },
                    poDispensedByPharmacy: true
                }
            );

            if (res.success) {
                if (targetStatus === "COMPLETED") {
                    toast.success("Purchase order approved and completed successfully!");
                } else {
                    toast.success("Medicine dispensed by RHU Pharmacy! Awaiting Center Admin approval.");
                }
                setDispenseModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to update appointment status.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to finalize dispensing.");
        } finally {
            setSubmitting(false);
        }
    };

    const executePoApprovalSubmission = () => {
        setConfirmApprovePoDialogOpen(false);
        handleUpdateStatus("COMPLETED");
    };

    const effectiveStatus = addData?.rhuStatus || (
        transaction.isCancelled || transaction.status === "REJECTED" || transaction.status === "CANCELLED" ? "CANCELLED" :
        transaction.status === "REFERRED" ? "REFERRED" :
        transaction.status === "COMPLETED" || transaction.status === "RELEASED" || transaction.status === "DELIVERED" ? "COMPLETED" :
        transaction.status === "FOR_CLAIM" ? "PO_APPROVED" :
        transaction.status === "PRESCRIBED" ? "PRESCRIBED" :
        transaction.status === "IN_CONSULTATION" ? "IN_CONSULTATION" :
        transaction.status === "CHECK_IN" || transaction.status === "EVALUATED" ? "CHECK_IN" :
        transaction.status === "FOR_PROCESSING" ? (addData?.deos ? "PRESCRIBED" : "IN_CONSULTATION") :
        "APPOINTMENT_BOOKED"
    );

    // Calculate progress step for status tracker (1 to 5)
    let currentStep = 1; // APPOINTMENT_BOOKED
    if (effectiveStatus === "CHECK_IN" || transaction.status === "EVALUATED") currentStep = 2;
    if (effectiveStatus === "IN_CONSULTATION") currentStep = 3;
    if (effectiveStatus === "PRESCRIBED" || effectiveStatus === "PO_APPROVED" || transaction.status === "FOR_CLAIM") currentStep = 4;
    if (effectiveStatus === "COMPLETED" || effectiveStatus === "DISPENSED" || effectiveStatus === "REFERRED" || transaction.status === "RELEASED" || transaction.status === "DELIVERED" || transaction.status === "REFERRED") currentStep = 5;
    if (transaction.isCancelled || effectiveStatus === "CANCELLED" || transaction.status === "REJECTED") currentStep = 0;


    const canReferOrCancel = (effectiveStatus === "APPOINTMENT_BOOKED" || effectiveStatus === "CHECK_IN" || effectiveStatus === "IN_CONSULTATION") && 
                             !transaction.isCancelled && 
                             transaction.status !== "RELEASED" && 
                             transaction.status !== "DELIVERED" && 
                             transaction.status !== "REJECTED";

    const getStatusPill = () => {
        if (transaction.isCancelled || effectiveStatus === "CANCELLED" || transaction.status === "REJECTED") {
            return (
                <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                    CANCELLED
                </span>
            );
        }
        switch (effectiveStatus) {
            case "APPOINTMENT_BOOKED":
            case "FOR_REQUESTING":
            case "FOR_INSPECTION":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        APPOINTMENT BOOKED
                    </span>
                );
            case "CHECK_IN":
            case "EVALUATED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        CHECKED IN
                    </span>
                );
            case "IN_CONSULTATION":
            case "FOR_PROCESSING":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md animate-pulse">
                        IN CONSULTATION
                    </span>
                );
            case "PRESCRIBED":
                if (addData.dispenseInfo || addData.dispensedAt || addData.poDispensedByPharmacy) {
                    return (
                        <span className="px-4 py-1.5 rounded-full bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md animate-pulse">
                            DISPENSED (PENDING PO APPROVAL)
                        </span>
                    );
                }
                return (
                    <span className="px-4 py-1.5 rounded-full bg-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        PRESCRIBED (READY FOR DISPENSING)
                    </span>
                );
            case "PO_APPROVED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        PO APPROVED (READY TO DISPENSE)
                    </span>
                );
            case "DISPENSED":
            case "COMPLETED":
            case "RELEASED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        COMPLETED
                    </span>
                );
            case "REFERRED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-fuchsia-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        REFERRED
                    </span>
                );
            default:
                if (transaction.status === "FOR_CLAIM") {
                    return (
                        <span className="px-4 py-1.5 rounded-full bg-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                            PO APPROVED (READY TO DISPENSE)
                        </span>
                    );
                }
                return (
                    <span className="px-4 py-1.5 rounded-full bg-slate-700 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        {transaction.status.replace(/_/g, " ")}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-20 w-full">
            {/* Top Navigation Row (matching Registrar Image 2) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/admin/rhu/consultations")}
                    className="h-10 px-0 hover:bg-transparent text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to RHU Consultations
                </Button>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-800/60 dark:bg-white/5 border border-slate-700/50 dark:border-white/10 px-3 py-1.5 rounded-xl">
                        ID: {transaction.controlNumber || transaction.id}
                    </span>
                    {getStatusPill()}
                </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">

                {/* LEFT COLUMN: Main Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Transaction Header Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">
                                    TRANSACTION INFORMATION
                                </p>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                    {checkupDisplay}
                                </h1>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-11">
                            RURAL HEALTH UNIT • MEDICAL CONSULTATION
                        </p>
                    </Card>

                    {/* Patient Profile & Record Details Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic mb-1">
                                PATIENT / APPLICANT NAME
                            </p>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                {patientName}
                            </h2>
                        </div>

                        {/* 4-Grid Sub-cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    RELATIONSHIP
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {addData.relationship || "SELF"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    GENDER
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {resident.gender || "MALE"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    BARANGAY
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {resident.barangay || "MAPANDAN"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    PRIORITY
                                </p>
                                <p className="text-xs font-black uppercase text-rose-500 italic">
                                    {isPriority ? "PRIORITY LANE" : "REGULAR"}
                                </p>
                            </div>
                        </div>

                        {/* Clinical Symptoms & Schedule Breakdown */}
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    APPOINTMENT DATE & TIME SLOT
                                </p>
                                <p className="text-sm font-black text-rose-500 font-mono italic">
                                    {formatDateTime(transaction.appointmentDate)} • {transaction.appointmentSlot || "08:00 AM - 11:00 AM"}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    CHIEF SYMPTOMS / PURPOSE / NOTES
                                </p>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {addData.symptomsPurpose || addData.purpose || "No additional clinical notes provided."}
                                </div>
                            </div>

                            {/* Referral Info if Referred */}
                            {transaction.status === "REFERRED" && (
                                <div className="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-xs space-y-1 text-fuchsia-700 dark:text-fuchsia-300">
                                    <p className="font-black uppercase tracking-wider text-[10px]">PATIENT REFERRAL DETAILS</p>
                                    <p className="font-bold">Referred Facility: {addData.referralFacility || "Specialty Hospital / Facility"}</p>
                                    {addData.referralReason && <p className="text-[11px] opacity-90">Reason: {addData.referralReason}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2">
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Date of Birth</span>
                                    <span className="text-slate-800 dark:text-slate-200">{resident.dateOfBirth ? formatDateTime(resident.dateOfBirth) : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Contact Number</span>
                                    <span className="text-slate-800 dark:text-slate-200">{resident.contactNumber || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attachments if present */}
                        {attachments.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                    ATTACHED MEDICAL RECORDS / ID PHOTOS ({attachments.length})
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {attachments.map((url, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setPreviewImage(url);
                                                setZoomScale(1);
                                                setRotateAngle(0);
                                            }}
                                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 aspect-video flex items-center justify-center"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Attachment ${idx + 1}`}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Patient Vitals Card (visible after check-in) */}
                    {addData.vitals && (
                        <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm overflow-hidden">
                            <div className="bg-slate-900 dark:bg-[#1c222d] px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">PATIENT VITALS</p>
                                        <p className="text-xs font-black text-white uppercase tracking-wide">Recorded at Check-In</p>
                                    </div>
                                </div>
                                {addData.checkedInAt && (
                                    <span className="text-[9px] font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                                        {new Date(addData.checkedInAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Critical Vitals Alert Banner */}
                                {(() => {
                                    const alerts: string[] = [];
                                    const tempEval = evaluateTemperature(addData.vitals.temperature);
                                    const bpEval = evaluateBloodPressure(addData.vitals.bloodPressure, addData.vitals.systolic, addData.vitals.diastolic);
                                    const pulseEval = evaluatePulseRate(addData.vitals.pulseRate);

                                    if (tempEval?.isCritical) alerts.push(`High Fever (${addData.vitals.temperature}°C)`);
                                    if (bpEval?.isCritical) alerts.push(`Hypertension (${addData.vitals.bloodPressure} mmHg - ${bpEval.category})`);
                                    if (pulseEval?.isCritical) alerts.push(`Abnormal Pulse (${addData.vitals.pulseRate} bpm - ${pulseEval.category})`);

                                    if (alerts.length === 0) return null;

                                    return (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400">
                                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse text-rose-500" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black uppercase tracking-wider text-rose-500">Critical Clinical Warning Detected</p>
                                                <p className="text-xs font-medium text-rose-300">
                                                    Patient presents abnormal vital signs: <span className="font-bold text-white">{alerts.join(" • ")}</span>. Immediate doctor evaluation recommended.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {/* Recorded / Checked-In By Staff Card */}
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-1 col-span-2 sm:col-span-3 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                Recorded / Checked-In By Staff (Accountability)
                                            </p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                {addData.vitals?.recordedBy || addData.checkedInBy || "RHU Check-In Staff"}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                                            ENCODER VERIFIED
                                        </span>
                                    </div>
                                    {/* Height */}
                                    {addData.vitals.height && (
                                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Height</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.height} cm</p>
                                        </div>
                                    )}

                                    {/* Weight */}
                                    {addData.vitals.weight && (
                                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weight</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.weight} kg</p>
                                        </div>
                                    )}

                                    {/* BMI with Badge */}
                                    {(() => {
                                        const bmiInfo = calculateBMI(addData.vitals.height, addData.vitals.weight);
                                        const bmiVal = addData.vitals.bmi || bmiInfo?.bmi;
                                        const bmiCat = addData.vitals.bmiCategory || bmiInfo?.category;
                                        if (!bmiVal) return null;
                                        const badgeClass = bmiInfo?.badgeClass || "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                                        return (
                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">BMI</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{bmiVal} <span className="text-[10px] font-medium text-slate-400">kg/m²</span></p>
                                                    {bmiCat && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${badgeClass}`}>
                                                            {bmiCat}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Blood Pressure */}
                                    {addData.vitals.bloodPressure && (() => {
                                        const bpEval = evaluateBloodPressure(addData.vitals.bloodPressure, addData.vitals.systolic, addData.vitals.diastolic);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${bpEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Blood Pressure</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.bloodPressure} <span className="text-[10px] font-medium text-slate-400">mmHg</span></p>
                                                    {bpEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${bpEval.badgeClass}`}>
                                                            {bpEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Temperature */}
                                    {addData.vitals.temperature && (() => {
                                        const tempEval = evaluateTemperature(addData.vitals.temperature);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${tempEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Temperature</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.temperature} <span className="text-[10px] font-medium text-slate-400">°C</span></p>
                                                    {tempEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${tempEval.badgeClass}`}>
                                                            {tempEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Pulse Rate */}
                                    {addData.vitals.pulseRate && (() => {
                                        const pulseEval = evaluatePulseRate(addData.vitals.pulseRate);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${pulseEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pulse Rate</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.pulseRate} <span className="text-[10px] font-medium text-slate-400">bpm</span></p>
                                                    {pulseEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${pulseEval.badgeClass}`}>
                                                            {pulseEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* PhilHealth & Konsultation Sub-section */}
                                {(addData.vitals.philhealthNumber || addData.vitals.konsultationNumber) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                        {addData.vitals.philhealthNumber && (
                                            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">PhilHealth Number</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">{addData.vitals.philhealthNumber}</p>
                                            </div>
                                        )}
                                        {addData.vitals.konsultationNumber && (
                                            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Konsultation No.</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">{addData.vitals.konsultationNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Doctor's Clinical Notes Card (visible after PRESCRIBED) */}
                    {addData.deos && (
                        <Card className="rounded-3xl border border-teal-500/20 dark:border-teal-500/10 bg-gradient-to-b from-slate-500/5 via-white dark:via-[#151922] to-slate-500/5 dark:to-[#0e1219] shadow-xl overflow-hidden backdrop-blur-md">
                            <div className="relative border-b border-teal-500/20 px-6 py-5 flex items-center gap-4 bg-teal-500/5">
                                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-teal-500/50 via-teal-500/10 to-transparent" />
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 shadow-inner">
                                    <ClipboardList className="w-5 h-5 text-teal-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-500/80">Clinical Notes & Orders</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Doctor&apos;s Consultation Record (DEOS)</p>
                                </div>
                                {addData.prescribedAt && (
                                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1 shadow-sm">
                                        {new Date(addData.prescribedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {addData.deos.attendingPhysician && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 text-xs font-bold text-teal-800 dark:text-teal-200">
                                        <Stethoscope className="w-5 h-5 text-teal-500 shrink-0" />
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Attending Physician (Medical Accountability)</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{addData.deos.attendingPhysician}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.diagnosis && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 font-mono font-black text-sm">
                                            D
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Diagnosis</p>
                                            <p className="text-sm font-black text-slate-950 dark:text-white whitespace-pre-wrap leading-relaxed tracking-tight">{addData.deos.diagnosis}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.examinationFindings && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 font-mono font-black text-sm">
                                            E
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Examination Findings</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.examinationFindings}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.orders && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-mono font-black text-sm">
                                            O
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Orders / Prescription</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.orders}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.status && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0 font-mono font-black text-sm">
                                            S
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Status / Notes</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.status}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.vaccines && Array.isArray(addData.vaccines) && addData.vaccines.length > 0 && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex flex-col gap-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 font-mono font-black text-sm">
                                                VAC
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Vaccine Batch Administered</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-1">
                                            {addData.vaccines.map((vax: any, idx: number) => (
                                                <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <strong className="text-white font-bold">{vax.name}</strong>
                                                        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-md border border-teal-500/20">
                                                            Dose: {vax.doseNumber || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                                                        <div><span className="font-semibold text-slate-500">Batch:</span> {vax.batchNumber || "N/A"}</div>
                                                        <div><span className="font-semibold text-slate-500">Date:</span> {vax.dateAdministered || "N/A"}</div>
                                                        <div><span className="font-semibold text-slate-500">Site:</span> {vax.site || "N/A"}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {addData.rxText && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 font-mono font-black text-sm">
                                            Rx
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Rx / Referral Formulations</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.rxText}</p>
                                        </div>
                                    </div>
                                )}
                                {(addData.referralFacility || addData.referralReason) && (
                                    <div className="group relative p-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 dark:bg-[#1a202c]/30 hover:border-fuchsia-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 dark:bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 shrink-0 font-mono font-black text-sm">
                                            REF
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400">Referral Details</p>
                                            {addData.referralFacility && (
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    <span className="text-slate-400">Facility:</span> {addData.referralFacility}
                                                </p>
                                            )}
                                            {addData.referralReason && (
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                                    <span className="text-slate-400">Reason:</span> {addData.referralReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Actual Pharmacy Dispensed Purchase Order Display Card */}
                    {addData.dispenseInfo && (
                        <Card className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 dark:bg-emerald-950/20 shadow-xl overflow-hidden backdrop-blur-md">
                            <div className="relative border-b border-emerald-500/30 px-6 py-5 flex items-center justify-between bg-emerald-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                        <Pill className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">RHU Pharmacy Recorded</p>
                                        <p className="text-sm font-black text-white uppercase tracking-tight italic">Actual Pharmacy Dispensed Purchase Order</p>
                                    </div>
                                </div>
                                {addData.dispenseInfo.dispensedBy && (
                                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded-full px-3 py-1">
                                        Dispensed by {addData.dispenseInfo.dispensedBy}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 space-y-3">
                                {addData.dispenseInfo.items && Array.isArray(addData.dispenseInfo.items) && addData.dispenseInfo.items.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {addData.dispenseInfo.items.map((it: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                        <Pill className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{it.name}</p>
                                                        <p className="text-[10px] text-emerald-400 font-mono">Actual Dispensed Quantity</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/40">
                                                    {it.quantity} {it.unit || "pcs"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 whitespace-pre-wrap">
                                        {addData.dispenseInfo.summaryText || "Medicine dispensed by pharmacy."}
                                    </div>
                                )}
                                {addData.dispenseInfo.dispensedAt && (
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pt-2">
                                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Dispensed on: {new Date(addData.dispenseInfo.dispensedAt).toLocaleString("en-US", { timeZone: "Asia/Manila" })}
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* RIGHT COLUMN: Status Tracker & Action Panel */}
                <div className="space-y-6">

                    {/* Status Tracker Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">
                                RHU WORKFLOW PROGRESS
                            </h3>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                7-STAGE CONSULTATION LIFECYCLE
                            </p>
                        </div>

                        {/* Step Timeline */}
                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                            {[
                                { step: 1, title: "1. APPOINTMENT BOOKED" },
                                { step: 2, title: "2. PATIENT CHECK-IN" },
                                { step: 3, title: "3. IN CONSULTATION" },
                                { 
                                    step: 4, 
                                    title: (addData.dispenseInfo || addData.dispensedAt || addData.poDispensedByPharmacy)
                                        ? "4. PRESCRIBED & DISPENSED (PENDING PO APPROVAL)" 
                                        : "4. PRESCRIBED (READY FOR DISPENSING)" 
                                },
                                { 
                                     step: 5, 
                                     title: (effectiveStatus === "REFERRED" || transaction.status === "REFERRED") 
                                         ? "5. REFERRED TO EXTERNAL FACILITY" 
                                         : "5. DISPENSED & COMPLETED" 
                                },
                            ].map((item) => {
                                const isPassed = (currentStep > item.step || currentStep === 5) && currentStep !== 0;
                                const isCurrent = currentStep === item.step && currentStep !== 5;
                                return (
                                    <div key={item.step} className="flex items-center gap-3 relative z-10">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isPassed
                                                ? (effectiveStatus === "REFERRED" || transaction.status === "REFERRED") ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20" : "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                : isCurrent
                                                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-4 ring-rose-500/20"
                                                    : "bg-slate-200 dark:bg-white/10 text-slate-400"
                                        }`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                                                isPassed || isCurrent ? "text-slate-900 dark:text-white" : "text-slate-400"
                                            }`}>
                                                {item.title}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Action / Final Decision Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 text-center space-y-6">
                        {transaction.isCancelled || transaction.status === "CANCELLED" || transaction.status === "REJECTED" ? (
                            <div className="py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                                    <XCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-rose-500">
                                        APPOINTMENT CANCELLED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        CANCELLED / REJECTED
                                    </p>
                                </div>
                                {transaction.rejectionRemarks && (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-left">
                                        {transaction.rejectionRemarks}
                                    </div>
                                )}
                            </div>
                        ) : (effectiveStatus === "REFERRED" || transaction.status === "REFERRED" || addData?.rhuStatus === "REFERRED") ? (
                            <div className="py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto text-fuchsia-500">
                                    <Activity className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-fuchsia-600 dark:text-fuchsia-400">
                                        PATIENT REFERRED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        REFERRED TO EXTERNAL MEDICAL FACILITY
                                    </p>
                                </div>

                                {(addData.referralFacility || addData.referralReason) && (
                                    <div className="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-xs text-left space-y-1.5">
                                        {addData.referralFacility && (
                                            <p className="text-slate-200">
                                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">Referred Facility:</span>
                                                <span className="font-black text-fuchsia-400 text-sm">{addData.referralFacility}</span>
                                            </p>
                                        )}
                                        {addData.referralReason && (
                                            <p className="text-slate-300">
                                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">Reason for Referral:</span>
                                                <span className="font-medium">{addData.referralReason}</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={() => setTriggerPrintReferral(true)}
                                    className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-fuchsia-600/20 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    PRINT REFERRAL SLIP
                                </Button>
                            </div>
                        ) : transaction.status === "COMPLETED" || transaction.status === "RELEASED" ? (
                            <div className="py-6 space-y-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                        CONSULTATION COMPLETED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        RHU CLINICAL CARE FINALIZED
                                    </p>
                                </div>
                                <Button
                                    onClick={() => window.print()}
                                    className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    PRINT CONSULTATION SLIP
                                </Button>
                            </div>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="space-y-1 text-left border-b border-slate-100 dark:border-white/5 pb-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        STAFF ACTIONS & NEXT STAGE
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Advance patient through the RHU consultation workflow
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {effectiveStatus === "APPOINTMENT_BOOKED" && (
                                        <Button
                                            disabled={submitting}
                                            onClick={handleOpenCheckInModal}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            CHECK IN PATIENT
                                        </Button>
                                    )}

                                    {effectiveStatus === "CHECK_IN" && (
                                        <Button
                                            disabled={submitting}
                                            onClick={handleOpenDeosModal}
                                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            START CONSULTATION
                                        </Button>
                                    )}

                                    {effectiveStatus === "IN_CONSULTATION" && (
                                        <Button
                                            disabled={submitting}
                                            onClick={handleOpenDeosModal}
                                            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            FINISH CONSULTATION & PRESCRIBE
                                        </Button>
                                    )}

                                    {effectiveStatus === "PRESCRIBED" && (() => {
                                        const isDispensed = !!(addData?.dispenseInfo || addData?.dispensedAt || addData?.poDispensedByPharmacy);
                                        const dispItems = addData?.dispenseInfo?.items;
                                        return (
                                            <div className="space-y-3">
                                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left space-y-2">
                                                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                                                        <Pill className="w-4 h-4" />
                                                        Patient Prescribed — {isDispensed ? "Dispensed by Pharmacy (Awaiting Center Admin Approval)" : "Pending Pharmacy Dispensing"}
                                                    </div>
                                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                        {isDispensed
                                                            ? `Medicine has been dispensed by RHU Pharmacy (${addData?.dispenseInfo?.dispensedBy || "Staff"}). Center Admin approval required to complete transaction.`
                                                            : "Doctor has encoded the prescription. RHU Pharmacy can dispense medicine before Center Admin approval."}
                                                    </p>

                                                    {/* Actual Pharmacy Dispensed Items Preview for Center Admin */}
                                                    {isDispensed && dispItems && Array.isArray(dispItems) && dispItems.length > 0 && (
                                                        <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Actual Pharmacy Dispensed Items:</p>
                                                            {dispItems.map((it: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center bg-slate-900/90 px-3 py-2 rounded-xl border border-emerald-500/30 text-xs">
                                                                    <span className="font-bold text-white truncate">{it.name}</span>
                                                                    <span className="font-mono font-black text-emerald-400">{it.quantity} {it.unit || "pcs"}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {(isPharmacyAccount || userRole === "RHU_PHARMACY") && !isDispensed && (
                                                    <Button
                                                        disabled={submitting}
                                                        onClick={handleOpenDispenseModal}
                                                        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                                                    >
                                                        <Pill className="w-4 h-4" />
                                                        DISPENSE MEDICINE
                                                    </Button>
                                                )}

                                                {(userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "RHU_CENTER_ADMIN" || userRole === "ADMIN_AIDE") && (
                                                    <Button
                                                        disabled={submitting}
                                                        onClick={() => setConfirmApprovePoDialogOpen(true)}
                                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        APPROVE PURCHASE ORDER
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {(effectiveStatus === "COMPLETED" || transaction.status === "RELEASED" || transaction.status === "DELIVERED") && (() => {
                                        const dispInfo = addData.dispenseInfo || (addData.dispensedBy ? { dispensedBy: typeof addData.dispensedBy === 'object' ? addData.dispensedBy.name : addData.dispensedBy, dispensedAt: addData.dispensedAt } : null);
                                        return (
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-left space-y-2">
                                                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    Consultation & Dispensing Completed
                                                </div>
                                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                    This health transaction has been fully processed, prescribed, and dispensed by the Rural Health Unit.
                                                </p>
                                                {dispInfo && (
                                                    <div className="pt-2 border-t border-emerald-500/20 text-xs space-y-1">
                                                        <div className="flex items-center justify-between text-slate-200">
                                                            <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Dispensed By:</span>
                                                            <span className="font-bold text-white text-[11px]">
                                                                {dispInfo.dispensedBy || dispInfo.dispensedByEmail || "RHU Pharmacy Personnel"}
                                                                {dispInfo.dispensedByRole ? ` (${dispInfo.dispensedByRole})` : ""}
                                                            </span>
                                                        </div>
                                                        {dispInfo.dispensedByEmail && dispInfo.dispensedBy && (
                                                            <div className="flex items-center justify-between text-slate-300">
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Staff Email:</span>
                                                                <span className="font-mono text-[10px] text-slate-300">{dispInfo.dispensedByEmail}</span>
                                                            </div>
                                                        )}
                                                        {dispInfo.dispensedAt && (
                                                            <div className="flex items-center justify-between text-slate-300">
                                                                <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Dispense Time:</span>
                                                                <span className="font-mono text-[10px] text-emerald-300 font-semibold">
                                                                    {new Date(dispInfo.dispensedAt).toLocaleString("en-US", { timeZone: "Asia/Manila" })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {effectiveStatus === "REFERRED" && (
                                        <div className="p-4 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl text-left space-y-2">
                                            <div className="flex items-center gap-2 text-fuchsia-400 font-black text-xs uppercase tracking-wider">
                                                <Activity className="w-4 h-4 text-fuchsia-400" />
                                                Patient Referred to External Hospital
                                            </div>
                                            <div className="text-xs text-slate-300 space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Hospital:</span> {addData.referralFacility || "N/A"}</p>
                                                {addData.referralReason && <p><span className="text-slate-400 font-bold uppercase text-[10px]">Reason:</span> {addData.referralReason}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {(effectiveStatus === "CANCELLED" || transaction.isCancelled || transaction.status === "REJECTED") && (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-left space-y-1.5">
                                            <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                                                <XCircle className="w-4 h-4 text-rose-400" />
                                                Appointment Cancelled
                                            </div>
                                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                {addData.cancellationRemarks ? `Reason: ${addData.cancellationRemarks}` : "This appointment was cancelled."}
                                            </p>
                                        </div>
                                    )}

                                    {canReferOrCancel && (
                                        <div className="pt-2 grid grid-cols-2 gap-2">
                                            <Button
                                                disabled={submitting}
                                                onClick={() => setReferralModalOpen(true)}
                                                className="h-10 bg-fuchsia-600/90 hover:bg-fuchsia-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1"
                                            >
                                                <Activity className="w-3.5 h-3.5" />
                                                REFER PATIENT
                                            </Button>
                                            <Button
                                                disabled={submitting}
                                                onClick={() => setCancelModalOpen(true)}
                                                className="h-10 bg-rose-600/90 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                CANCEL APPT
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Patient Vitals Check-In Dialog */}
            <Dialog open={vitalsModalOpen} onOpenChange={(open) => { setVitalsModalOpen(open); if (!open) setVitalsErrors({}); }}>
                <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] bg-white dark:bg-[#151922] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col">
                    {/* Modal Header */}
                    <div className="bg-slate-900 dark:bg-[#1c222d] px-8 py-6 border-b border-slate-100 dark:border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-white leading-none">
                                    Patient Check-In
                                </DialogTitle>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Record Vitals Before Consultation</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-white/[0.04] border border-white/10 rounded-2xl">
                            <p className="text-xs font-black text-white uppercase tracking-wide">{patientName}</p>
                            <p className="text-[10px] text-rose-400 uppercase tracking-widest font-bold mt-0.5">{checkupDisplay}</p>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-5 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {/* Height & Weight */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Anthropometric Measurements</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Height (cm) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 165"
                                        value={vitals.height}
                                        onChange={(e) => setVitals(p => ({ ...p, height: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.height ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.height && <p className="text-[10px] text-red-500 font-medium">Height is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Weight (kg) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 60"
                                        value={vitals.weight}
                                        onChange={(e) => setVitals(p => ({ ...p, weight: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.weight ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.weight && <p className="text-[10px] text-red-500 font-medium">Weight is required.</p>}
                                </div>
                            </div>
                            {/* Live Calculated BMI */}
                            {(() => {
                                const bmiRes = calculateBMI(vitals.height, vitals.weight);
                                if (!bmiRes) return null;
                                return (
                                    <div className={`mt-3 p-3.5 rounded-2xl border flex items-center justify-between transition-all ${bmiRes.badgeClass}`}>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-widest">Calculated BMI</p>
                                            <p className="text-sm font-black uppercase">{bmiRes.bmi} <span className="text-[10px] font-bold">kg/m²</span></p>
                                        </div>
                                        <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-white/20 dark:bg-black/20">
                                            {bmiRes.category}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Blood Pressure */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Pressure (mmHg)</p>
                                {(() => {
                                    const bpRes = evaluateBloodPressure(undefined, vitals.systolic, vitals.diastolic);
                                    if (!bpRes) return null;
                                    return (
                                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${bpRes.badgeClass}`}>
                                            {bpRes.category}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Systolic <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 120"
                                        value={vitals.systolic}
                                        onChange={(e) => setVitals(p => ({ ...p, systolic: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.systolic ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.systolic && <p className="text-[10px] text-red-500 font-medium">Systolic BP is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Diastolic <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 80"
                                        value={vitals.diastolic}
                                        onChange={(e) => setVitals(p => ({ ...p, diastolic: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.diastolic ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.diastolic && <p className="text-[10px] text-red-500 font-medium">Diastolic BP is required.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Temperature & Pulse Rate */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Other Vitals</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            Temperature (°C) <span className="text-rose-500">*</span>
                                        </Label>
                                        {(() => {
                                            const tRes = evaluateTemperature(vitals.temperature);
                                            if (!tRes) return null;
                                            return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${tRes.badgeClass}`}>{tRes.category}</span>;
                                        })()}
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="e.g. 36.5"
                                        value={vitals.temperature}
                                        onChange={(e) => setVitals(p => ({ ...p, temperature: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.temperature ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.temperature && <p className="text-[10px] text-red-500 font-medium">Temperature is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            Pulse Rate (bpm) <span className="text-rose-500">*</span>
                                        </Label>
                                        {(() => {
                                            const pRes = evaluatePulseRate(vitals.pulseRate);
                                            if (!pRes) return null;
                                            return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${pRes.badgeClass}`}>{pRes.category}</span>;
                                        })()}
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 72"
                                        value={vitals.pulseRate}
                                        onChange={(e) => setVitals(p => ({ ...p, pulseRate: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.pulseRate ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.pulseRate && <p className="text-[10px] text-red-500 font-medium">Pulse rate is required.</p>}
                                </div>
                            </div>
                        </div>

                        {/* PhilHealth & Konsultation */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">PhilHealth / Konsultation</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">PhilHealth Number</Label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. 01-234567890-1"
                                        value={vitals.philhealthNumber}
                                        onChange={(e) => setVitals(p => ({ ...p, philhealthNumber: e.target.value }))}
                                        className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Konsultation No.</Label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. KSL-2026-001"
                                        value={vitals.konsultationNumber}
                                        onChange={(e) => setVitals(p => ({ ...p, konsultationNumber: e.target.value }))}
                                        className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                            </div>

                            {/* Staff Encoder Accountability (Read-only Authenticated Display) */}
                            <div className="pt-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Staff / Encoder Accountability</p>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Recorded / Checked-In By Staff</Label>
                                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserCheck className="w-4 h-4 text-rose-500 shrink-0" />
                                            <span className="truncate text-slate-800 dark:text-white font-black">{currentUser?.name || "RHU Staff"}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md shrink-0 border border-rose-500/20">
                                            AUTHENTICATED
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end px-8 py-5 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => { setVitalsModalOpen(false); setVitalsErrors({}); }}
                            className="h-11 px-6 rounded-xl text-xs font-bold uppercase text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={handleConfirmCheckIn}
                            className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Checking In..." : "Confirm Check-In"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Audit & Data Accuracy Warning Confirmation Dialog */}
            <Dialog open={confirmCheckInDialogOpen} onOpenChange={setConfirmCheckInDialogOpen}>
                <DialogContent className="sm:max-w-[640px] max-h-[88vh] overflow-y-auto overflow-x-hidden bg-[#0f172a] border border-rose-500/40 text-white rounded-3xl shadow-2xl p-6 space-y-5 custom-scrollbar">
                    <DialogTitle className="sr-only">Confirm Patient Vitals Accuracy</DialogTitle>

                    {/* Warning Header */}
                    <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">MEDICAL ACCOUNTABILITY AUDIT</p>
                            <h3 className="text-base font-black text-white uppercase italic tracking-wide">Confirm Data Accuracy Before Submitting</h3>
                        </div>
                    </div>

                    {/* Warning Callout Box */}
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-rose-200 text-xs font-semibold leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 text-[11px]">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            Staff Responsibility Notice
                        </p>
                        <p>
                            You are about to submit official medical vitals under your authenticated account: <strong className="text-white font-black uppercase underline decoration-rose-500">{currentUser?.name || "RHU Staff"}</strong>.
                        </p>
                        <p className="text-[11px] text-rose-300">
                            Falsifying or inputting incorrect vital signs can affect patient diagnosis and treatment safety. Your name and timestamp will be permanently logged in the official medical audit trail.
                        </p>
                    </div>

                    {/* Vitals Summary Card */}
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1.5">Vitals Summary Review</p>
                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                            <div><span className="text-slate-400">Patient:</span> <strong className="text-white uppercase font-black">{patientName}</strong></div>
                            <div><span className="text-slate-400">Encoder:</span> <strong className="text-rose-400 uppercase font-black">{currentUser?.name || "RHU Staff"}</strong></div>
                            <div><span className="text-slate-400">BP:</span> <strong className="text-white font-bold">{vitals.systolic}/{vitals.diastolic} mmHg</strong></div>
                            <div><span className="text-slate-400">Height:</span> <strong className="text-white font-bold">{vitals.height} cm</strong></div>
                            <div><span className="text-slate-400">Weight:</span> <strong className="text-white font-bold">{vitals.weight} kg</strong></div>
                            <div><span className="text-slate-400">Temp / Pulse:</span> <strong className="text-white font-bold">{vitals.temperature}°C / {vitals.pulseRate} bpm</strong></div>
                            {vitals.philhealthNumber && <div><span className="text-slate-400">PhilHealth No.:</span> <strong className="text-emerald-400 font-bold">{vitals.philhealthNumber}</strong></div>}
                            {vitals.konsultationNumber && <div><span className="text-slate-400">Konsultation No.:</span> <strong className="text-emerald-400 font-bold">{vitals.konsultationNumber}</strong></div>}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="flex gap-2 justify-end pt-2 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmCheckInDialogOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Go Back & Review
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={executeCheckInSubmission}
                            className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Saving..." : "Yes, I Confirm Data Is Correct"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Audit & Clinical Accountability Warning Confirmation Dialog */}
            <Dialog open={confirmDeosDialogOpen} onOpenChange={setConfirmDeosDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto overflow-x-hidden bg-[#0f172a] border border-rose-500/40 text-white rounded-3xl shadow-2xl p-6 space-y-5 custom-scrollbar">
                    <DialogTitle className="sr-only">Confirm Clinical Diagnosis & Prescription Accuracy</DialogTitle>

                    {/* Warning Header */}
                    <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">LEGAL & MEDICAL ACCOUNTABILITY AUDIT</p>
                            <h3 className="text-base font-black text-white uppercase italic tracking-wide">Confirm Clinical Record Before Submitting</h3>
                        </div>
                    </div>

                    {/* Warning Callout Box */}
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-rose-200 text-xs font-semibold leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 text-[11px]">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            Prescribing Physician Responsibility Notice
                        </p>
                        <p>
                            You are about to issue official clinical diagnosis and medical prescriptions under your authenticated license: <strong className="text-white font-black uppercase underline decoration-rose-500">{currentUser?.name || "Attending Physician"}</strong>.
                        </p>
                        <p className="text-[11px] text-rose-300">
                            Issuing improper or inaccurate medical orders carries strict medical-legal accountability. Your name, email, and timestamp will be permanently attached as the prescribing physician.
                        </p>
                    </div>

                    {/* Clinical Summary Card */}
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prescription & Clinical Summary Review</p>
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">Draft Review</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 font-semibold text-slate-300">
                            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Patient Name</span>
                                <strong className="text-white uppercase text-xs font-black">{patientName}</strong>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Attending Physician</span>
                                <strong className="text-rose-400 uppercase text-xs font-black">{currentUser?.name || "Attending Physician"}</strong>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            {/* D-E-O-S Section */}
                            <div className="space-y-2.5 bg-slate-950/40 border border-white/5 p-3 rounded-2xl">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-1.5 mb-1">
                                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Clinical Consultation Details</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Diagnosis (D)</span>
                                        <p className="text-white font-bold text-xs bg-white/5 p-2.5 rounded-xl border border-white/5 max-h-24 overflow-y-auto break-words custom-scrollbar">{deos.diagnosis}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Examination Findings (E)</span>
                                        <p className="text-slate-200 font-medium text-xs bg-white/5 p-2.5 rounded-xl border border-white/5 max-h-24 overflow-y-auto break-words custom-scrollbar">{deos.examinationFindings}</p>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">Orders / Prescribed Medicines (O)</span>
                                    <p className="text-rose-200 font-bold text-xs bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 whitespace-pre-wrap max-h-32 overflow-y-auto break-words custom-scrollbar">{deos.orders}</p>
                                </div>
                                {deos.status && (
                                    <div className="space-y-1 pt-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Status / Notes (S)</span>
                                        <p className="text-slate-300 font-medium text-xs bg-white/5 p-2.5 rounded-xl border border-white/5 max-h-20 overflow-y-auto break-words custom-scrollbar">{deos.status}</p>
                                    </div>
                                )}
                            </div>

                            {/* Vaccine Batch Review */}
                            {vaccines.some((v: any) => v.name.trim() !== "") && (
                                <div className="relative overflow-hidden bg-slate-950/40 border border-teal-500/20 p-3.5 rounded-2xl space-y-2.5">
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-emerald-500" />
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-1.5">
                                        <Syringe className="w-4 h-4 text-teal-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Vaccine Batch Administered</span>
                                    </div>
                                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                                        {vaccines.filter((v: any) => v.name.trim() !== "").map((v: any, idx: number) => (
                                            <div key={idx} className="bg-white/[0.03] p-3 rounded-xl border border-white/5 text-[11px] space-y-1.5 relative overflow-hidden group">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-white font-bold text-xs truncate max-w-[65%]">{v.name}</span>
                                                    <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20 shrink-0">
                                                        Dose: {v.doseNumber || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-400 leading-tight bg-black/10 p-1.5 rounded-lg border border-white/5">
                                                    <div><span className="text-slate-500 block font-semibold uppercase text-[7px] tracking-wider mb-0.5">Batch</span> {v.batchNumber || "N/A"}</div>
                                                    <div><span className="text-slate-500 block font-semibold uppercase text-[7px] tracking-wider mb-0.5">Date</span> {v.dateAdministered || "N/A"}</div>
                                                    <div><span className="text-slate-500 block font-semibold uppercase text-[7px] tracking-wider mb-0.5">Injection Site</span> {v.site || "N/A"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rx / Referral Review */}
                            {rxText.trim() && (
                                <div className="relative overflow-hidden bg-slate-950/40 border border-teal-500/20 p-3.5 rounded-2xl space-y-2">
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-teal-500" />
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-1.5">
                                        <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Rx / Referral Formulations</span>
                                    </div>
                                    <p className="text-teal-200 font-medium text-xs bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 whitespace-pre-wrap max-h-36 overflow-y-auto break-words custom-scrollbar leading-relaxed">{rxText}</p>
                                </div>
                            )}

                            {/* Referral Review */}
                            {(referralFacility.trim() || referralReason.trim()) && (
                                <div className="relative overflow-hidden bg-slate-950/40 border border-fuchsia-500/20 p-3.5 rounded-2xl space-y-2.5">
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-fuchsia-500 to-purple-500" />
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-1.5">
                                        <Building className="w-4 h-4 text-fuchsia-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400">Referral Details Review</span>
                                    </div>
                                    <div className="bg-fuchsia-500/5 p-3 rounded-xl border border-fuchsia-500/20 text-xs space-y-2.5">
                                        {referralFacility.trim() && (
                                            <div>
                                                <span className="text-slate-400 font-bold uppercase text-[8px] tracking-widest block mb-0.5">Destination Facility</span>
                                                <strong className="text-fuchsia-300 font-black text-xs uppercase">{referralFacility}</strong>
                                            </div>
                                        )}
                                        {referralReason.trim() && (
                                            <div>
                                                <span className="text-slate-400 font-bold uppercase text-[8px] tracking-widest block mb-0.5">Reason for Referral</span>
                                                <p className="text-slate-200 text-xs mt-0.5 leading-relaxed bg-black/10 p-2 rounded-lg border border-white/5">{referralReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="flex gap-2 justify-end pt-2 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDeosDialogOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Go Back & Edit Notes
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={executePrescriptionSubmission}
                            className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Prescribing..." : "Yes, I Confirm Clinical Record Is Correct"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Audit & Pharmacy Accountability Warning Confirmation Dialog */}
            <Dialog open={confirmDispenseDialogOpen} onOpenChange={setConfirmDispenseDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto overflow-x-hidden bg-[#0f172a] border border-rose-500/40 text-white rounded-3xl shadow-2xl p-6 space-y-5 custom-scrollbar">
                    <DialogTitle className="sr-only">Confirm Medicine Dispensing & Inventory Deduction</DialogTitle>

                    {/* Warning Header */}
                    <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">PHARMACY INVENTORY ACCOUNTABILITY AUDIT</p>
                            <h3 className="text-base font-black text-white uppercase italic tracking-wide">Confirm Dispensing & Stock Deduction</h3>
                        </div>
                    </div>

                    {/* Warning Callout Box */}
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-rose-200 text-xs font-semibold leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 text-[11px]">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            Dispensing Staff Responsibility Notice
                        </p>
                        <p>
                            You are about to authorize official medicine dispensing and deduct inventory stock under your authenticated account: <strong className="text-white font-black uppercase underline decoration-rose-500">{currentUser?.name || "RHU Pharmacy Staff"}</strong>.
                        </p>
                        <p className="text-[11px] text-rose-300">
                            Please verify that the physical medicines handed to patient <strong className="text-white uppercase font-bold">{patientName}</strong> match Dr. <strong className="text-white font-bold">{addData.deos?.attendingPhysician || "Attending Physician"}</strong>&apos;s prescription. Inventory stock will be permanently deducted and your name logged as the dispensing staff.
                        </p>
                    </div>

                    {/* Dispense & Inventory Summary Card */}
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1.5">Dispensing Summary Review</p>
                        <div className="grid grid-cols-2 gap-2 font-medium">
                            <div><span className="text-slate-400">Patient:</span> <strong className="text-white uppercase font-black">{patientName}</strong></div>
                            <div><span className="text-slate-400">Dispensing Staff:</span> <strong className="text-rose-400 uppercase font-black">{currentUser?.name || "RHU Pharmacy Staff"}</strong></div>
                            <div><span className="text-slate-400">Prescribing Doctor:</span> <strong className="text-teal-300 uppercase font-black">{addData.deos?.attendingPhysician || "Attending Physician"}</strong></div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">Medicines to Dispense & Deduct:</span>
                            <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto custom-scrollbar">
                                {dispenseItems.filter(i => Number(i.qtyToDispense) > 0).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                                        <span className="font-bold text-white">{item.name}</span>
                                        <span className="font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-md">
                                            Deduct: {item.qtyToDispense} {item.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="flex gap-2 justify-end pt-2 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDispenseDialogOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Go Back & Review Quantities
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={executeDispenseSubmission}
                            className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Dispensing..." : "Yes, I Confirm Dispensing Is Correct"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Audit & Center Admin Approval Warning Confirmation Dialog */}
            <Dialog open={confirmApprovePoDialogOpen} onOpenChange={setConfirmApprovePoDialogOpen}>
                <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto overflow-x-hidden bg-[#0f172a] border border-rose-500/40 text-white rounded-3xl shadow-2xl p-6 space-y-5 custom-scrollbar">
                    <DialogTitle className="sr-only">Confirm Purchase Order Approval & Completion</DialogTitle>

                    {/* Warning Header */}
                    <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">ADMINISTRATIVE & MEDICAL ACCOUNTABILITY AUDIT</p>
                            <h3 className="text-base font-black text-white uppercase italic tracking-wide">Confirm Final PO Approval & Completion</h3>
                        </div>
                    </div>

                    {/* Warning Callout Box */}
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-rose-200 text-xs font-semibold leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 text-[11px]">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            Center Admin Final Approval Responsibility Notice
                        </p>
                        <p>
                            You are about to authorize final executive approval and mark this Purchase Order as <strong className="text-white font-black uppercase underline decoration-rose-500">COMPLETED</strong> under your authenticated account: <strong className="text-white font-black uppercase underline decoration-rose-500">{currentUser?.name || "Center Admin"}</strong>.
                        </p>
                        <p className="text-[11px] text-rose-300">
                            Please verify that all clinical notes and pharmacy medicine dispensing items for patient <strong className="text-white uppercase font-bold">{patientName}</strong> are accurate. Once approved, this consultation cycle will be officially completed and logged in the municipal audit trail.
                        </p>
                    </div>

                    {/* PO & Dispensing Summary Card */}
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1.5">Purchase Order Approval Summary Review</p>
                        <div className="grid grid-cols-2 gap-2 font-medium">
                            <div><span className="text-slate-400">Patient:</span> <strong className="text-white uppercase font-black">{patientName}</strong></div>
                            <div><span className="text-slate-400">Center Admin Approver:</span> <strong className="text-rose-400 uppercase font-black">{currentUser?.name || "Center Admin"}</strong></div>
                            <div><span className="text-slate-400">Prescribing Doctor:</span> <strong className="text-teal-300 uppercase font-black">{addData?.deos?.attendingPhysician || "Attending Physician"}</strong></div>
                            <div><span className="text-slate-400">Dispensing Staff:</span> <strong className="text-teal-300 uppercase font-black">{addData?.dispenseInfo?.dispensedBy || "RHU Pharmacy Staff"}</strong></div>
                        </div>
                        {addData?.dispenseInfo?.items && Array.isArray(addData.dispenseInfo.items) && addData.dispenseInfo.items.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Actual Pharmacy Dispensed Items:</span>
                                <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {addData.dispenseInfo.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                                            <span className="font-bold text-white">{item.name}</span>
                                            <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                {item.quantity} {item.unit || "pcs"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="flex gap-2 justify-end pt-2 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmApprovePoDialogOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Go Back & Review Record
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={executePoApprovalSubmission}
                            className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Approving..." : "Yes, I Confirm Final Approval"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Doctor Console Modal */}
            <Dialog open={deosModalOpen} onOpenChange={(open) => { setDeosModalOpen(open); if (!open) setDeosErrors({}); }}>
                <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1300px] w-[95vw] max-h-[88vh] bg-[#0d1117] border border-slate-200/20 dark:border-white/10 rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col">
                    <DialogTitle className="sr-only">Doctor Consultation Console - {patientName}</DialogTitle>
                    <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 h-full overflow-hidden">
                        {/* LEFT PANEL: Patient Chronicles (4 cols) */}
                        <div className="md:col-span-4 bg-[#0d1117] border-r border-white/10 flex flex-col h-full min-h-0 overflow-hidden">
                            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-4 flex items-center gap-3 shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">PATIENT CHRONICLES</p>
                                    <p className="text-xs font-black text-white uppercase truncate max-w-[220px]">{patientName}</p>
                                </div>
                                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">IN CONSULTATION</span>
                            </div>

                            <div className="overflow-y-auto flex-1 p-6 space-y-5 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {/* Patient Identity */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Patient Identity</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: "Gender", value: resident.gender || "N/A" },
                                            { label: "Date of Birth", value: resident.dateOfBirth ? formatDateTime(resident.dateOfBirth) : "N/A" },
                                            { label: "Barangay", value: addData.barangay || resident.barangay || "N/A" },
                                            { label: "Contact", value: resident.contactNumber || "N/A" },
                                            { label: "Relationship", value: addData.relationship || "SELF" },
                                            { label: "Priority", value: isPriority ? "PRIORITY LANE" : "REGULAR" },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-0.5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                                                <p className="text-[11px] font-black text-white uppercase">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Appointment */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Appointment</p>
                                    <div className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Consultation Type</p>
                                        <p className="text-xs font-black text-amber-400 uppercase">{checkupDisplay}</p>
                                    </div>
                                    {addData.chiefComplaint && (
                                        <div className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Chief Complaint / Purpose</p>
                                            <p className="text-xs font-bold text-slate-300">{addData.chiefComplaint}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Vitals Timeline */}
                                {addData.vitals && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Vitals at Check-In</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Recorded By Staff", value: addData.vitals?.recordedBy || addData.checkedInBy || "RHU Check-In Staff" },
                                                { label: "Height", value: addData.vitals.height ? `${addData.vitals.height} cm` : null },
                                                { label: "Weight", value: addData.vitals.weight ? `${addData.vitals.weight} kg` : null },
                                                { 
                                                    label: "BMI", 
                                                    value: addData.vitals.bmi 
                                                        ? `${addData.vitals.bmi} kg/m² (${addData.vitals.bmiCategory || calculateBMI(addData.vitals.height, addData.vitals.weight)?.category || ''})` 
                                                        : (calculateBMI(addData.vitals.height, addData.vitals.weight) ? `${calculateBMI(addData.vitals.height, addData.vitals.weight)?.bmi} kg/m² (${calculateBMI(addData.vitals.height, addData.vitals.weight)?.category})` : null) 
                                                },
                                                { label: "Blood Pressure", value: addData.vitals.bloodPressure ? `${addData.vitals.bloodPressure} mmHg` : null },
                                                { label: "Temperature", value: addData.vitals.temperature ? `${addData.vitals.temperature} °C` : null },
                                                { label: "Pulse Rate", value: addData.vitals.pulseRate ? `${addData.vitals.pulseRate} bpm` : null },
                                                { label: "PhilHealth No.", value: addData.vitals.philhealthNumber || null },
                                                { label: "Konsultation No.", value: addData.vitals.konsultationNumber || null },
                                            ].filter(v => v.value).map((item, i) => (
                                                <div key={i} className={`p-3 rounded-xl space-y-0.5 ${item.label === "Recorded By Staff" ? "col-span-2 bg-rose-500/10 border border-rose-500/20" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${item.label === "Recorded By Staff" ? "text-rose-400" : "text-indigo-400"}`}>{item.label}</p>
                                                    <p className="text-[11px] font-black text-white uppercase">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Doctor Encoder (8 cols) */}
                        <div className="md:col-span-8 bg-[#111827] flex flex-col h-full min-h-0 overflow-hidden">
                            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                                        <ClipboardList className="w-4 h-4 text-teal-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400">DOCTOR CONSOLE</p>
                                        <p className="text-xs font-black text-white uppercase">Clinical Encoder</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-white/10 shrink-0">
                                {(["deos", "vaccine", "rx"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            activeTab === tab
                                                ? "bg-teal-500/10 text-teal-400 border-b-2 border-teal-500"
                                                : "text-slate-500 hover:text-slate-300"
                                        }`}
                                    >
                                        {tab === "deos" ? "D·E·O·S" : tab === "vaccine" ? "Vaccine Batch" : "RX / Referral"}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-4 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {activeTab === "deos" && (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Diagnosis · Examination · Orders · Status</p>

                                        {/* Attending Physician (Read-only Authenticated Display) */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attending Physician / Prescribing Doctor</Label>
                                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs font-bold text-teal-300">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Stethoscope className="w-4 h-4 text-teal-400 shrink-0" />
                                                    <span className="truncate text-white font-black">{currentUser?.name || "Attending Physician"}</span>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md shrink-0 border border-teal-500/20">
                                                    AUTHENTICATED
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">D — Diagnosis <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                placeholder="e.g. Acute URTI, Hypertension Stage 1..."
                                                value={deos.diagnosis}
                                                onChange={(e) => setDeos(p => ({ ...p, diagnosis: e.target.value }))}
                                                rows={3}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.diagnosis ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.diagnosis && <p className="text-[10px] text-red-500 font-medium">Diagnosis is required.</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E — Examination Findings <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                placeholder="e.g. BP 120/80, Temp 37.2°C, clear breath sounds..."
                                                value={deos.examinationFindings}
                                                onChange={(e) => setDeos(p => ({ ...p, examinationFindings: e.target.value }))}
                                                rows={3}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.examinationFindings ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.examinationFindings && <p className="text-[10px] text-red-500 font-medium">Examination findings are required.</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    O — Orders / Prescription <span className="text-rose-500">*</span>
                                                </Label>
                                                <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Pill className="w-3 h-3" /> RHU Catalog Helper
                                                </span>
                                            </div>

                                            {/* Medicine & Supplies Catalog Search Box */}
                                            <div className="bg-white/[0.03] border border-white/10 p-3 rounded-2xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                                        <Input
                                                            placeholder="Search RHU Medicine Catalog (e.g. Amoxicillin, Paracetamol)..."
                                                            value={medSearchQuery}
                                                            onChange={(e) => setMedSearchQuery(e.target.value)}
                                                            className="h-8 pl-9 pr-3 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-xs font-medium"
                                                        />
                                                    </div>
                                                    {medSearchQuery && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setMedSearchQuery("")}
                                                            className="h-8 px-2 text-xs text-slate-400 hover:text-white"
                                                        >
                                                            Clear
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Search Results Dropdown / Panel */}
                                                {medSearchQuery.trim().length > 0 && (
                                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-white/5">
                                                        {loadingInventory ? (
                                                            <div className="space-y-2 p-1">
                                                                {[1, 2, 3].map((i) => (
                                                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                                                                        <div className="space-y-1.5 flex-1">
                                                                            <Skeleton className="h-3.5 w-40 rounded-md bg-white/10" />
                                                                            <Skeleton className="h-2.5 w-24 rounded-md bg-white/5" />
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Skeleton className="h-5 w-20 rounded-md bg-white/10" />
                                                                            <Skeleton className="h-7 w-12 rounded-lg bg-teal-600/30" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : filteredMeds.length === 0 ? (
                                                            <div className="text-xs text-slate-400 italic p-2 text-center">
                                                                No catalog items found matching &quot;{medSearchQuery}&quot;. You can still prescribe items manually below.
                                                            </div>
                                                        ) : (
                                                            filteredMeds.map((item) => {
                                                                const expInfo = getItemDisplayExpiry(item);
                                                                const usableStock = getUnexpiredStock(item);
                                                                const isOutOfStock = usableStock <= 0;
                                                                const isExpired = usableStock <= 0 && expInfo.isExpired;

                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => handleAddMedicineToOrders(item)}
                                                                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-teal-500/10 border border-white/5 hover:border-teal-500/30 cursor-pointer transition-all group"
                                                                    >
                                                                        <div className="space-y-0.5 max-w-[65%]">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-xs font-bold text-white group-hover:text-teal-300">{item.name}</p>
                                                                                {item.dosage && (
                                                                                    <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-mono">{item.dosage}</span>
                                                                                )}
                                                                            </div>
                                                                            {(item.genericName || item.brandName) && (
                                                                                <p className="text-[10px] text-slate-400 truncate">
                                                                                    {item.genericName && `Generic: ${item.genericName}`}
                                                                                    {item.brandName && ` | Brand: ${item.brandName}`}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            {/* Stock & Expiration Status Badges */}
                                                                            <div className="text-right space-y-0.5">
                                                                                <div>
                                                                                    {isOutOfStock ? (
                                                                                        <Badge className="text-[10px] uppercase font-black px-2.5 py-1 bg-red-600 text-white border border-red-500 shadow-md">
                                                                                            {isExpired ? "OUT OF STOCK (EXPIRED)" : "OUT OF STOCK (EXTERNAL)"}
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge className="text-[10px] uppercase font-black px-2.5 py-1 bg-emerald-600 text-white border border-emerald-500 shadow-md">
                                                                                            IN STOCK: {usableStock} {item.unit}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-300 font-bold font-mono">
                                                                                    {isExpired ? (
                                                                                        <span className="text-rose-400 font-black">Exp: {expInfo.text}</span>
                                                                                    ) : expInfo.isExpiringSoon ? (
                                                                                        <span className="text-amber-400 font-black">Exp: {expInfo.text}</span>
                                                                                    ) : (
                                                                                        <span>Exp: {expInfo.text}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg px-2"
                                                                            >
                                                                                + Add
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <Textarea
                                                placeholder="e.g. Amoxicillin 500mg TID x 7 days, CBC, rest..."
                                                value={deos.orders}
                                                onChange={(e) => setDeos(p => ({ ...p, orders: e.target.value }))}
                                                rows={4}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.orders ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.orders && <p className="text-[10px] text-red-500 font-medium">Orders / Prescription are required.</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">S — Status / Notes <span className="text-slate-600 font-bold normal-case tracking-normal">(optional)</span></Label>
                                            <Textarea
                                                placeholder="e.g. Follow-up in 1 week, advised rest..."
                                                value={deos.status}
                                                onChange={(e) => setDeos(p => ({ ...p, status: e.target.value }))}
                                                rows={2}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "vaccine" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Vaccine Batch Encoder</p>
                                            <button
                                                onClick={() => setVaccines((v: any[]) => [...v, { name: "", batchNumber: "", doseNumber: "", dateAdministered: "", site: "" }])}
                                                className="text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-lg transition-colors"
                                            >
                                                + Add Vaccine
                                            </button>
                                        </div>
                                        {vaccines.map((vax: any, idx: number) => (
                                            <div key={idx} className="border border-white/10 p-4 rounded-xl space-y-3 bg-white/[0.02]">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">Vaccine #{idx + 1}</p>
                                                    {vaccines.length > 1 && (
                                                        <button onClick={() => setVaccines((v: any[]) => v.filter((_: any, i: number) => i !== idx))} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Remove</button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vaccine Name</Label>
                                                        <Input value={vax.name} onChange={(e) => setVaccines((v: any[]) => v.map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="e.g. Flu Vaccine" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Batch Number</Label>
                                                        <Input value={vax.batchNumber} onChange={(e) => setVaccines((v: any[]) => v.map((x: any, i: number) => i === idx ? { ...x, batchNumber: e.target.value } : x))} placeholder="e.g. BN-2026-001" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dose No.</Label>
                                                        <Input value={vax.doseNumber} onChange={(e) => setVaccines((v: any[]) => v.map((x: any, i: number) => i === idx ? { ...x, doseNumber: e.target.value } : x))} placeholder="e.g. 1st, 2nd" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date Administered</Label>
                                                        <Input type="date" value={vax.dateAdministered} onChange={(e) => setVaccines((v: any[]) => v.map((x: any, i: number) => i === idx ? { ...x, dateAdministered: e.target.value } : x))} className="h-9 rounded-xl bg-white/5 text-white text-xs border-white/10" />
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Site of Injection</Label>
                                                        <Input value={vax.site} onChange={(e) => setVaccines((v: any[]) => v.map((x: any, i: number) => i === idx ? { ...x, site: e.target.value } : x))} placeholder="e.g. Left deltoid" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === "rx" && (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Digital Prescription / Referral Encoder</p>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prescription Text</Label>
                                            <Textarea
                                                placeholder="Detailed prescription notes, drug dosages, frequency, duration..."
                                                value={rxText}
                                                onChange={(e) => setRxText(e.target.value)}
                                                rows={8}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                        <div className="border-t border-white/10 pt-4 space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Referral (if needed)</p>
                                            <Input
                                                placeholder="Referral facility name"
                                                value={referralFacility}
                                                onChange={(e) => setReferralFacility(e.target.value)}
                                                className="h-10 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10"
                                            />
                                            <Textarea
                                                placeholder="Reason for referral..."
                                                value={referralReason}
                                                onChange={(e) => setReferralReason(e.target.value)}
                                                rows={3}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/10 px-6 py-4 bg-[#0d1117] flex gap-3 items-center justify-end shrink-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setDeosModalOpen(false); setDeosErrors({}); }}
                                    className="h-11 px-6 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={submitting}
                                    onClick={handleConfirmPrescription}
                                    className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
                                >
                                    <Activity className="w-4 h-4" />
                                    {submitting ? "Prescribing..." : "Finish Consultation & Prescribe"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Referral Dialog */}
            <Dialog open={referralModalOpen} onOpenChange={(open) => {
                setReferralModalOpen(open);
                if (!open) { setHospitalSearchQuery(""); setHospitalDropdownOpen(false); }
            }}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-8">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-fuchsia-600 dark:text-fuchsia-400">
                            Refer <span className="text-slate-900 dark:text-white">Patient</span>
                        </DialogTitle>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Medical Referral Record</p>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        {/* Step 1: Search from registered centers */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Search Registered Health Centers
                            </p>
                            <div className="relative">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="hospital-search-input"
                                        placeholder="Search available center..."
                                        value={hospitalSearchQuery}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setHospitalSearchQuery(val);
                                            setHospitalDropdownOpen(val.length > 0);
                                        }}
                                        onFocus={() => setHospitalDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setHospitalDropdownOpen(false), 180)}
                                        className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border-slate-200 dark:border-white/10"
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Dropdown */}
                                {hospitalDropdownOpen && (
                                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                                        {loadingCenters && (
                                            <div className="p-3 space-y-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex items-center gap-3 px-2 py-1.5 animate-pulse">
                                                        <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
                                                        <div className="flex-1 space-y-1.5">
                                                            <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                            <div className="h-2 w-1/2 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!loadingCenters && filteredHospitals.length > 0 && (
                                            <>
                                                <div className="px-4 py-2 bg-fuchsia-500/5 border-b border-slate-100 dark:border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-fuchsia-500">
                                                        Registered Health Centers ({filteredHospitals.length})
                                                    </p>
                                                </div>
                                                {filteredHospitals.map((center: any) => (
                                                    <button
                                                        key={center.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setReferralFacility(center.name);
                                                            setHospitalSearchQuery(center.name);
                                                            setHospitalDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 transition-colors border-b border-slate-100 dark:border-white/5 last:border-b-0 flex items-start gap-2.5"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shrink-0 mt-1.5" />
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight">
                                                                {center.name}
                                                            </p>
                                                            {(center.barangay || center.location) && (
                                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                                    📍 {center.barangay ? `Brgy. ${center.barangay}` : center.location}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                        {!loadingCenters && filteredHospitals.length === 0 && hospitalSearchQuery.length > 0 && (
                                            <div className="px-4 py-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    No registered center found
                                                </p>
                                            </div>
                                        )}
                                        {!loadingCenters && filteredHospitals.length === 0 && !hospitalSearchQuery && (
                                            <div className="px-4 py-3 text-[10px] font-bold text-slate-400">
                                                Start typing to search available centers
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or enter manually</span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                        </div>

                        {/* Step 2: Manual input */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Referral Hospital / Facility Name <span className="text-rose-500">*</span>
                            </p>
                            <Input
                                placeholder="e.g. Region 1 Medical Center, Pangasinan Provincial Hospital..."
                                value={referralFacility}
                                onChange={(e) => {
                                    setReferralFacility(e.target.value);
                                    setHospitalSearchQuery(e.target.value);
                                }}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border-slate-200 dark:border-white/10"
                            />
                            {referralFacility.trim() && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
                                    <span className="w-2 h-2 rounded-full bg-fuchsia-500 shrink-0" />
                                    <span className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400 truncate">{referralFacility}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setReferralFacility(""); setHospitalSearchQuery(""); }}
                                        className="ml-auto text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                                    >
                                        ✕ Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Reason for Referral */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Referral</p>
                            <Input
                                placeholder="e.g. Specialty evaluation, emergency care, advanced diagnostics..."
                                value={referralReason}
                                onChange={(e) => setReferralReason(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setReferralModalOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={submitting || !referralFacility.trim()}
                            onClick={() => handleUpdateStatus("REFERRED", undefined, { facility: referralFacility, reason: referralReason })}
                            className="h-11 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-md"
                        >
                            Confirm Referral
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Appointment Dialog */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            Cancel <span className="text-red-500">Appointment</span>
                        </DialogTitle>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Cancellation Protocol</p>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Cancellation</p>
                            <Input
                                placeholder="Why is this appointment being cancelled? (e.g. Invalid schedule, patient request...)"
                                value={cancelRemarks}
                                onChange={(e) => setCancelRemarks(e.target.value)}
                                className="h-14 rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic px-6 text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setCancelModalOpen(false)}
                            className="h-12 px-6 rounded-2xl text-xs font-bold uppercase"
                        >
                            Back
                        </Button>
                        <Button
                            disabled={submitting || !cancelRemarks}
                            onClick={() => handleUpdateStatus("CANCELLED", cancelRemarks)}
                            className="h-14 bg-red-600 hover:bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                        >
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Preview Modal */}
            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-4xl p-4 bg-slate-950/95 text-white border-white/10 rounded-3xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Document Lightbox Preview</DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoomScale(s => Math.min(s + 0.25, 3))}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRotateAngle(a => (a + 90) % 360)}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <RotateCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center min-h-[400px] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewImage}
                                alt="Preview"
                                style={{
                                    transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)`,
                                    transition: "transform 0.2s ease-in-out"
                                }}
                                className="max-h-[70vh] object-contain rounded-xl"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {/* Dispense Medicine Confirmation Modal */}
            <Dialog open={dispenseModalOpen} onOpenChange={setDispenseModalOpen}>
                <DialogContent className="max-w-2xl bg-[#0f172a] text-white border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                    <DialogHeader className="space-y-1.5 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <Pill className="w-5 h-5" />
                            <DialogTitle className="text-lg font-black uppercase italic tracking-wider">
                                Dispense Medicine Confirmation
                            </DialogTitle>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            Review doctor orders, confirm stock deduction, and finalize dispensing for <span className="text-white font-bold">{patientName}</span>.
                        </p>
                    </DialogHeader>

                    {/* Prescribed Orders Summary */}
                    <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Prescribed Orders</p>
                            <span className="text-[10px] font-black text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                                Prescribed By: <strong className="text-white font-black uppercase">{addData.deos?.attendingPhysician || "Attending Physician"}</strong>
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-teal-300 whitespace-pre-wrap leading-relaxed pt-1">
                            {addData.deos?.orders || addData.deos?.diagnosis || "No specific orders encoded."}
                        </p>
                    </div>

                    {/* Items & Stock Deduction List */}
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Medicines to Dispense & Deduct</span>
                            <span>Quantity & Stock</span>
                        </div>

                        {loadingInventory ? (
                            <div className="space-y-2.5">
                                {[1, 2].map((i) => (
                                    <div key={i} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-44 rounded-lg bg-slate-800" />
                                            <Skeleton className="h-3 w-28 rounded-md bg-slate-800/60" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-3 w-12 rounded-md bg-slate-800/60" />
                                            <Skeleton className="h-8 w-16 rounded-lg bg-slate-800" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : dispenseItems.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-900/40 rounded-xl border border-slate-800">
                                No matching inventory medicines detected automatically.
                            </div>
                        ) : (
                            dispenseItems.map((item, idx) => {
                                const numQty = Number(item.qtyToDispense);
                                const isOutOfStockItem = item.currentStock <= 0;
                                const isOverStock = isOutOfStockItem || numQty > item.currentStock;
                                const isInvalid = !isOutOfStockItem && item.qtyToDispense !== "" && (isNaN(numQty) || numQty <= 0);
                                return (
                                    <div key={item.id || idx} className="space-y-1">
                                        <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border gap-3 ${
                                            isOverStock || isInvalid ? "border-red-500 bg-red-500/5 focus-visible:ring-red-500" : "border-slate-800"
                                        }`}>
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                                <p className={`text-[10px] font-mono ${isOutOfStockItem ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                                                    Current Stock: <span className="font-bold">{item.currentStock} {item.unit}</span>
                                                    {isOutOfStockItem && <span className="ml-2 text-red-400 font-bold">(NO VALID STOCK)</span>}
                                                    {!isOutOfStockItem && !isOverStock && numQty > 0 && (
                                                        <span className="text-slate-400 ml-2">
                                                            → New Stock: <span className="text-amber-400 font-bold">{item.currentStock - numQty} {item.unit}</span>
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Label className="text-[10px] text-slate-400 font-bold">Dispense Qty:</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={Math.max(0, item.currentStock)}
                                                    disabled={isOutOfStockItem}
                                                    placeholder="0"
                                                    value={item.qtyToDispense}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDispenseItems(prev => prev.map((it, i) => i === idx ? { ...it, qtyToDispense: val } : it));
                                                    }}
                                                    className={`w-20 h-8 text-xs font-bold bg-slate-800 text-white text-center rounded-lg ${
                                                        isOverStock || isInvalid ? "border-red-500 focus-visible:ring-red-500 text-red-400" : "border-slate-700"
                                                    }`}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDispenseItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {isOutOfStockItem ? (
                                            <p className="text-[10px] text-red-500 font-medium px-2">
                                                This item has no non-expired stock in inventory and cannot be dispensed.
                                            </p>
                                        ) : isInvalid ? (
                                            <p className="text-[10px] text-red-500 font-medium px-2">
                                                Please enter the quantity to dispense.
                                            </p>
                                        ) : isOverStock ? (
                                            <p className="text-[10px] text-red-500 font-medium px-2">
                                                Cannot dispense more than available stock ({item.currentStock} {item.unit}).
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-800 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDispenseModalOpen(false)}
                            disabled={submitting}
                            className="h-10 text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={submitting}
                            onClick={handleConfirmDispenseAndComplete}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Dispensing..." : "Confirm & Dispense Medicine"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Printable Official Medical Referral Slip */}
            <PrintReferralSlip
                controlNumber={transaction.controlNumber || transaction.id}
                patientId={transaction.userId || transaction.controlNumber || transaction.id}
                patientName={patientName}
                gender={resident.gender}
                dateOfBirth={resident.dateOfBirth || addData.dateOfBirth}
                barangay={resident.barangay || addData.barangay}
                contactNumber={resident.contactNumber || addData.phoneNumber}
                philhealthNumber={addData.vitals?.philhealthNumber}
                referringFacility={addData.healthCenterName || currentCenterName || "Mapandan Rural Health Unit"}
                destinationFacility={addData.referralFacility || "Pangasinan Provincial Hospital / Main RHU"}
                referredAt={addData.referredAt || transaction.updatedAt || new Date()}
                checkupType={checkupDisplay}
                symptoms={addData.customCheckupType || addData.notes || transaction.notes}
                vitals={addData.vitals}
                clinicalDiagnosis={addData.deos?.diagnosis}
                examinationFindings={addData.deos?.examinationFindings}
                reasonForReferral={addData.referralReason}
                attendingPhysician={addData.deos?.attendingPhysician || currentUser?.name}
                triggerPrint={triggerPrintReferral}
                onPrintCompleted={() => setTriggerPrintReferral(false)}
            />
        </div>
    );
}
