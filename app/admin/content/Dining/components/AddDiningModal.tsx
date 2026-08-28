"use client";

import React, { useState } from "react";
import { Store, Save, X } from "lucide-react";
import { useDining } from "../providers/DiningProvider";
import { useDiningForm } from "../hooks/useDiningForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddDiningModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useDining();
    const { handleSubmit, loading } = useDiningForm();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState<boolean>(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Sync only when opening or when editing item ID changes
    React.useEffect(() => {
        if (isAddModalOpen) {
            setImagePreview(editingData?.imageUrl || null);
            setIsImageRemoved(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
            setImagePreview(null);
            setIsImageRemoved(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [editingData?.id, isAddModalOpen]);

    const handleClose = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
            setImagePreview(null);
            setIsImageRemoved(false);
        }, 200);
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setIsImageRemoved(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog
            open={isAddModalOpen}
            onOpenChange={(open) => {
                setIsAddModalOpen(open);
                if (!open) {
                    setTimeout(() => {
                        setEditingData(null);
                        setImagePreview(null);
                    }, 200);
                }
            }}
        >
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    {/* Header */}
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}>
                                <Store className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Dining Place" : "Add New Dining"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    {editingData ? "Modify the details of this dining listing below." : "Enter the details for the new dining listing below. It will be published immediately."}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 z-50 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    {/* Scrollable Form Body */}
                    <div className="p-8 pb-28 overflow-y-auto custom-scrollbar">
                        <form key={editingData?.id || "new-dining-form"} id="diningForm" onSubmit={handleSubmit} className="space-y-6">
                            {/* Row 1: Name & Category */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Dining Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="name" name="name" defaultValue={editingData?.name || ""} required className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="e.g. Mapandan Seafood Restaurant" />
                                </div>
                                <div>
                                    <Label htmlFor="cuisineType" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Cuisine Type / Category
                                    </Label>
                                    <Input id="cuisineType" name="cuisineType" defaultValue={editingData?.cuisineType || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="Filipino, Seafood, Cafe..." />
                                </div>
                            </div>

                            {/* Row 2: Description */}
                            <div>
                                <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Description
                                </Label>
                                <Textarea id="description" name="description" defaultValue={editingData?.description || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white min-h-[100px] resize-none" placeholder="Describe the offerings, specialties, and ambiance..." />
                            </div>

                            {/* Row 3: Location & Maps */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Location / Complete Address <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="address" name="address" defaultValue={editingData?.address || ""} required className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="Brgy. Poblacion, Mapandan" />
                                </div>
                                <div>
                                    <Label htmlFor="googleMapsUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Google Maps Link
                                    </Label>
                                    <Input id="googleMapsUrl" name="googleMapsUrl" defaultValue={editingData?.googleMapsUrl || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="https://maps.google.com/..." />
                                </div>
                            </div>

                            {/* Row 4: Contact & Socials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="contactNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Contact Number
                                    </Label>
                                    <Input id="contactNumber" name="contactNumber" defaultValue={editingData?.contactNumber || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="0912 345 6789" />
                                </div>
                                <div>
                                    <Label htmlFor="facebookUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Facebook Page / Social Link
                                    </Label>
                                    <Input id="facebookUrl" name="facebookUrl" defaultValue={editingData?.facebookUrl || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="https://facebook.com/..." />
                                </div>
                            </div>

                            {/* Row 5: Operating Hours & Barangay */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="openingHours" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Operating Hours
                                    </Label>
                                    <Input id="openingHours" name="openingHours" defaultValue={editingData?.openingHours || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="Mon-Sun: 8:00 AM - 9:00 PM" />
                                </div>
                                <div>
                                    <Label htmlFor="barangay" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Barangay Location
                                    </Label>
                                    <Input id="barangay" name="barangay" defaultValue={editingData?.barangay || currentBarangay || ""} className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11" placeholder="Poblacion" />
                                </div>
                            </div>

                            {/* Image Upload Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Cover / Banner Image
                                    </Label>
                                    {imagePreview && (
                                        <button
                                            type="button"
                                            onClick={handleClearImage}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" /> Remove Image
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        name="imageFile"
                                        accept="image/*"
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setIsImageRemoved(false);
                                                const reader = new FileReader();
                                                reader.onloadend = () => setImagePreview(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                                <input
                                    type="hidden"
                                    name="imageRemoved"
                                    value={isImageRemoved ? "true" : "false"}
                                />
                                {editingData?.imageUrl && imagePreview === editingData.imageUrl && !isImageRemoved && (
                                    <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
                                )}
                                {imagePreview && (
                                    <div className="mt-4 relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-[#2a3040]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 sticky bottom-0 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3 z-50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="h-11 px-6 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="diningForm"
                            disabled={loading}
                            className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{editingData ? "Update Dining Place" : "Save Dining Place"}</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
