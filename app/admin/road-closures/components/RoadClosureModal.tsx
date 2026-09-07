"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RoadClosureStatus, RoadClosureSeverity } from "@prisma/client";
import { RoadClosureMapPicker, PointLocation } from "./RoadClosureMapPicker";
import { createRoadClosureAction, updateRoadClosureAction, RoadClosureInput } from "../actions";
import { toast } from "sonner";
import { Loader2, AlertTriangle, MapPin } from "lucide-react";

interface RoadClosureModalProps {
    isOpen: boolean;
    onClose: () => void;
    closureToEdit?: any | null;
    barangaysList: { id: string; name: string }[];
    userManagedBarangay?: string | null;
    isBarangayAdmin?: boolean;
    onSuccess?: (savedData: any, isEdit: boolean) => void;
}

export function RoadClosureModal({
    isOpen,
    onClose,
    closureToEdit,
    barangaysList,
    userManagedBarangay,
    isBarangayAdmin,
    onSuccess,
}: RoadClosureModalProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [roadName, setRoadName] = useState("");
    const [barangay, setBarangay] = useState<string>("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<RoadClosureStatus>(RoadClosureStatus.CLOSED);
    const [severity, setSeverity] = useState<RoadClosureSeverity>(RoadClosureSeverity.HIGH);
    const [detourAdvice, setDetourAdvice] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startLocation, setStartLocation] = useState<PointLocation | null>(null);
    const [endLocation, setEndLocation] = useState<PointLocation | null>(null);

    useEffect(() => {
        if (closureToEdit) {
            setTitle(closureToEdit.title || "");
            setRoadName(closureToEdit.roadName || "");
            setBarangay(closureToEdit.barangay || "");
            setDescription(closureToEdit.description || "");
            setStatus(closureToEdit.status || RoadClosureStatus.CLOSED);
            setSeverity(closureToEdit.severity || RoadClosureSeverity.HIGH);
            setDetourAdvice(closureToEdit.detourAdvice || "");
            setStartDate(
                closureToEdit.startDate
                    ? new Date(closureToEdit.startDate).toISOString().slice(0, 16)
                    : ""
            );
            setEndDate(
                closureToEdit.endDate
                    ? new Date(closureToEdit.endDate).toISOString().slice(0, 16)
                    : ""
            );
            setStartLocation(closureToEdit.startLocation || null);
            setEndLocation(closureToEdit.endLocation || null);
        } else {
            // New record defaults
            setTitle("");
            setRoadName("");
            setBarangay(isBarangayAdmin && userManagedBarangay ? userManagedBarangay : "");
            setDescription("");
            setStatus(RoadClosureStatus.CLOSED);
            setSeverity(RoadClosureSeverity.HIGH);
            setDetourAdvice("");
            setStartDate(new Date().toISOString().slice(0, 16));
            setEndDate("");
            setStartLocation(null);
            setEndLocation(null);
        }
    }, [closureToEdit, isOpen, isBarangayAdmin, userManagedBarangay]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Please enter a title or notice headline.");
            return;
        }

        if (!startLocation || !endLocation) {
            toast.error("Please select both Start (Point A) and End (Point B) on the map.");
            return;
        }

        setLoading(true);

        const payload: RoadClosureInput = {
            title: title.trim(),
            roadName: roadName.trim() || undefined,
            barangay: isBarangayAdmin && userManagedBarangay ? userManagedBarangay : (barangay || undefined),
            description: description.trim() || undefined,
            status,
            severity,
            detourAdvice: detourAdvice.trim() || undefined,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            startLocation,
            endLocation,
        };

        try {
            if (closureToEdit?.id) {
                const res = await updateRoadClosureAction(closureToEdit.id, payload);
                if (res.success) {
                    toast.success("Road closure advisory updated successfully!");
                    onClose();
                    onSuccess?.(res.data, true);
                } else {
                    toast.error(res.error || "Failed to update road closure.");
                }
            } else {
                const res = await createRoadClosureAction(payload);
                if (res.success) {
                    toast.success("Road closure advisory published!");
                    onClose();
                    onSuccess?.(res.data, false);
                } else {
                    toast.error(res.error || "Failed to create road closure.");
                }
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl w-full max-h-[92vh] flex flex-col rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c111d] p-0 shadow-2xl overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight">
                                {closureToEdit ? "Edit Road Advisory / Closure" : "New Road Advisory / Closure"}
                            </DialogTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Pin affected road segment in Mapandan, Pangasinan and set public detour guidelines.
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Spacious Interactive Map Picker */}
                        <div className="lg:col-span-7 flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    Mapandan Road Map (Click Start & End Points) *
                                </Label>
                            </div>
                            <div className="flex-1">
                                <RoadClosureMapPicker
                                    startLocation={startLocation}
                                    endLocation={endLocation}
                                    onChange={(start, end) => {
                                        setStartLocation(start);
                                        setEndLocation(end);
                                    }}
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Form Controls */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Notice Headline / Title *
                                </Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Poblacion Drainage Repair"
                                    className="h-11 rounded-xl font-medium"
                                    required
                                />
                            </div>

                            {/* Road Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="roadName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Road / Street Name
                                </Label>
                                <Input
                                    id="roadName"
                                    value={roadName}
                                    onChange={(e) => setRoadName(e.target.value)}
                                    placeholder="e.g. Mapandan - Manaoag Provincial Road"
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            {/* Barangay, Status & Severity */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="barangay" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Barangay
                                    </Label>
                                    {isBarangayAdmin && userManagedBarangay ? (
                                        <Input
                                            value={userManagedBarangay}
                                            disabled
                                            className="h-11 rounded-xl font-bold bg-slate-100 dark:bg-white/5"
                                        />
                                    ) : (
                                        <Select value={barangay} onValueChange={setBarangay}>
                                            <SelectTrigger className="h-11 rounded-xl">
                                                <SelectValue placeholder="All / Town-wide" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-56">
                                                <SelectItem value="All">Town-wide / Multi-Barangay</SelectItem>
                                                {barangaysList.map((b) => (
                                                    <SelectItem key={b.id} value={b.name}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Status
                                    </Label>
                                    <Select
                                        value={status}
                                        onValueChange={(val) => setStatus(val as RoadClosureStatus)}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value={RoadClosureStatus.CLOSED}>🛑 CLOSED</SelectItem>
                                            <SelectItem value={RoadClosureStatus.PARTIALLY_CLOSED}>⚠️ PARTIAL</SelectItem>
                                            <SelectItem value={RoadClosureStatus.DETOUR_ONLY}>↪️ DETOUR ONLY</SelectItem>
                                            <SelectItem value={RoadClosureStatus.REOPENED}>✅ REOPENED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Severity / Priority
                                </Label>
                                <Select
                                    value={severity}
                                    onValueChange={(val) => setSeverity(val as RoadClosureSeverity)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value={RoadClosureSeverity.LOW}>Low</SelectItem>
                                        <SelectItem value={RoadClosureSeverity.MODERATE}>Moderate</SelectItem>
                                        <SelectItem value={RoadClosureSeverity.HIGH}>High</SelectItem>
                                        <SelectItem value={RoadClosureSeverity.CRITICAL}>Critical (Emergency)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="startDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Start Date & Time
                                    </Label>
                                    <Input
                                        id="startDate"
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-11 rounded-xl text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="endDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Expected Reopening
                                    </Label>
                                    <Input
                                        id="endDate"
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-11 rounded-xl text-xs"
                                    />
                                </div>
                            </div>

                            {/* Detour Advice */}
                            <div className="space-y-1.5">
                                <Label htmlFor="detourAdvice" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Recommended Detour / Advisory
                                </Label>
                                <Textarea
                                    id="detourAdvice"
                                    rows={2}
                                    value={detourAdvice}
                                    onChange={(e) => setDetourAdvice(e.target.value)}
                                    placeholder="e.g. Light vehicles pass via Torres bypass. Heavy trucks rerouted to Santa Maria."
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            {/* Detailed Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Additional Details (Optional)
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Culvert installation and road widening project."
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 mt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl h-11 px-5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider px-8 shadow-lg shadow-amber-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : closureToEdit ? (
                                "Update Advisory"
                            ) : (
                                "Publish Road Closure"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
