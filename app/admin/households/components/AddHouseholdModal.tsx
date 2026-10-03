"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useHousehold } from "../providers/HouseholdProvider";
import { useHouseholdForm } from "../hooks/useHouseholdForm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Home, MapPin, Users, ShieldAlert, UserCheck } from "lucide-react";
import { HeadSearch } from "../../residents/components/HeadSearch";
import { getHeadDetails } from "../../actions";
import LocationPicker from "./LocationPicker";
import lguConfig from "@/config/lgu.config.json";

export function AddHouseholdModal() {
    const { data: session } = useSession();
    const managedBarangay = (session?.user as any)?.managedBarangay;
    const role = (session?.user as any)?.role;

    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, selectedCoords, setSelectedCoords } = useHousehold();
    const { handleSubmit, loading } = useHouseholdForm();

    const barangays = ["{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}"];
    const riskLevels = ["Safe", "Low Risk", "Moderate Risk", "High Risk", "Flood Prone", "Landslide Prone"];

    // Form State
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [headId, setHeadId] = useState("");
    const [headName, setHeadName] = useState("");
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [householdSize, setHouseholdSize] = useState("1");
    const [contactNumber, setContactNumber] = useState("");
    const [isPickingLocation, setIsPickingLocation] = useState(false);

    // Effect to initialize/reset form
    useEffect(() => {
        if (isAddModalOpen) {
            const timer = setTimeout(() => {
                if (editingData) {
                    setLat(editingData.latitude?.toString() || "");
                    setLng(editingData.longitude?.toString() || "");
                    setHeadId(editingData.headId || "");
                    setHeadName(editingData.headOfFamily || "");
                    setSelectedBarangay(editingData.barangay || "");
                    setHouseholdSize(editingData.householdSize?.toString() || "1");
                    setContactNumber(editingData.contactNumber || "");
                } else if (selectedCoords) {
                    setLat(selectedCoords.lat.toString());
                    setLng(selectedCoords.lng.toString());
                    setHeadId("");
                    setHeadName("");
                } else {
                    setLat("");
                    setLng("");
                    setHeadId("");
                    setHeadName("");
                    setSelectedBarangay(managedBarangay || "");
                    setHouseholdSize("1");
                    setContactNumber("");
                }
                setIsPickingLocation(false);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isAddModalOpen, editingData, selectedCoords, managedBarangay]);

    const handleHeadSelect = async (id: string, name: string) => {
        setHeadId(id);
        setHeadName(name);
        const res = await getHeadDetails(id);
        if (res.success && res.data) {
            setSelectedBarangay(res.data.barangay);
            setHouseholdSize(res.data.familyCount.toString());
            setContactNumber(res.data.contactNumber || "");
        }
    };

    const handleGetCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLat(position.coords.latitude.toString());
                setLng(position.coords.longitude.toString());
            });
        }
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                // Short delay to allow animation to finish before clearing
                setTimeout(() => {
                    setEditingData(null);
                    setSelectedCoords(null);
                }, 200);
            }
        }}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-[#151b2b] sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040]">
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-2 bg-primary rounded-lg">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Household Data" : "Add New Household"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                    Map and log a household entry for DRRM and census tracking.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <form id="householdForm" onSubmit={handleSubmit} className="space-y-8">
                            {/* HIDDEN INPUTS - These bridge the React state to the native FormData submission */}
                            <input type="hidden" name="headId" value={headId} />
                            <input type="hidden" name="latitude" value={lat} />
                            <input type="hidden" name="longitude" value={lng} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Family details */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                                        <UserCheck className="w-4 h-4 text-primary" />
                                        Head of the Family / Primary Contact <span className="text-red-500">*</span>
                                    </Label>
                                    <HeadSearch 
                                        onSelect={handleHeadSelect}
                                        defaultValue={headName}
                                    />
                                    <p className="text-[10px] text-slate-500 italic mt-1 uppercase tracking-wider font-bold">
                                        Selected ID: <span className="text-primary">{headId || "None"}</span>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Barangay <span className="text-red-500">*</span></Label>
                                    <Select 
                                        name="barangay" 
                                        value={selectedBarangay} 
                                        onValueChange={setSelectedBarangay}
                                        disabled={!!managedBarangay && role === "BARANGAY_ADMIN"}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold">
                                            <SelectValue placeholder="Select Barangay" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {barangays.map(b => <SelectItem key={b} value={b} className="font-bold">{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
 
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest flex items-center">
                                        <Users className="w-4 h-4 mr-1 text-slate-500" /> Household Size <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        name="householdSize"
                                        required
                                        min="1"
                                        value={householdSize}
                                        onChange={(e) => setHouseholdSize(e.target.value)}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                    />
                                </div>
 
                                {/* Coordinates Section */}
                                <div className="space-y-4 md:col-span-2 p-6 bg-slate-100/50 dark:bg-[#1a1f2e] rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#2a3040] transition-all duration-500">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2a3040]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/20">
                                                <MapPin className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Geographic Data</Label>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Precision Plotting</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGetCurrentLocation}
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-full"
                                            >
                                                GPS
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                onClick={() => setIsPickingLocation(!isPickingLocation)}
                                                className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg transition-all ${isPickingLocation ? 'bg-red-500' : 'bg-primary'}`}
                                            >
                                                {isPickingLocation ? "Close Map" : "Pinpoint"}
                                            </Button>
                                        </div>
                                    </div>
 
                                    {isPickingLocation ? (
                                        <div className="pt-2 animate-in zoom-in-95 duration-300">
                                            <LocationPicker 
                                                initialLat={parseFloat(lat) || lguConfig.map.latitude || 0}
                                                initialLng={parseFloat(lng) || lguConfig.map.longitude || 0}
                                                onSelect={(selectedLat, selectedLng) => {
                                                    setLat(selectedLat.toString());
                                                    setLng(selectedLng.toString());
                                                    setIsPickingLocation(false);
                                                }}
                                                onClose={() => setIsPickingLocation(false)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Latitude <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    value={lat}
                                                    onChange={(e) => setLat(e.target.value)}
                                                    placeholder="0.000000"
                                                    className="font-mono h-12 bg-white dark:bg-[#0f1117] border-2 border-slate-200 dark:border-[#2a3040] rounded-xl text-lg font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Longitude <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    value={lng}
                                                    onChange={(e) => setLng(e.target.value)}
                                                    placeholder="0.000000"
                                                    className="font-mono h-12 bg-white dark:bg-[#0f1117] border-2 border-slate-200 dark:border-[#2a3040] rounded-xl text-lg font-bold"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest flex items-center">
                                        <ShieldAlert className="w-4 h-4 mr-1 text-slate-500" /> Risk Level
                                    </Label>
                                    <Select name="riskLevel" defaultValue={editingData?.riskLevel || "Safe"}>
                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold">
                                            <SelectValue placeholder="Assess Risk" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {riskLevels.map(r => <SelectItem key={r} value={r} className="font-bold">{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Contact Number</Label>
                                    <Input
                                        name="contactNumber"
                                        value={contactNumber}
                                        onChange={(e) => setContactNumber(e.target.value)}
                                        placeholder="09XX XXX XXXX"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Additional Notes</Label>
                                    <Textarea
                                        name="notes"
                                        defaultValue={editingData?.notes || ""}
                                        placeholder="Add any specific observations..."
                                        className="min-h-[100px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 dark:bg-[#151b2b] sticky bottom-0 z-50 border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3 rounded-b-2xl">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAddModalOpen(false)}
                            className="h-12 px-8 font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                                    type="submit"
                                    form="householdForm"
                                    disabled={loading}
                                    className="h-12 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/30 rounded-xl transition-all hover:scale-105 active:scale-95"
                                >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                            ) : (
                                editingData ? "Update Registry" : "Plot Household"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
