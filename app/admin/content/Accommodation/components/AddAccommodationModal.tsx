"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, Save, Building2, X } from "lucide-react";
import { useAccommodation } from "../providers/AccommodationProvider";
import { useAccommodationForm } from "../hooks/useAccommodationForm";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AddAccommodationModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useAccommodation();
    const { handleSubmit, loading } = useAccommodationForm();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState<boolean>(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Sync only when opening modal or when switching editing record ID / imageUrl
    useEffect(() => {
        if (isAddModalOpen) {
            setImagePreview(editingData?.imageUrl || null);
            setIsImageRemoved(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
            setImagePreview(null);
            setIsImageRemoved(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [editingData?.id, editingData?.imageUrl, isAddModalOpen]);

    const handleClose = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
            setImagePreview(null);
            setIsImageRemoved(false);
        }, 200);
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
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
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Tuluyan Details" : "Add New Accommodation"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    {editingData ? "Modify the details of this stay listing below." : "Enter the details for the new stay listing below. It will be published immediately."}
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
                        <form 
                            key={editingData ? `${editingData.id}-${editingData.description || ""}-${editingData.priceRange || ""}-${editingData.websiteUrl || ""}` : "new-accommodation-form"} 
                            id="accommodationForm" 
                            onSubmit={handleSubmit} 
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Accommodation Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editingData?.name || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="e.g. Villa San Jose Resort"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="type" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Property Type <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="type"
                                        name="type"
                                        defaultValue={editingData?.type || "Resort"}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Resort, Hotel, Homestay, Transient..."
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editingData?.description || ""}
                                    className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white min-h-[100px] resize-none"
                                    placeholder="Describe rooms, pool facilities, ambiance..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Address / Location <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        defaultValue={editingData?.address || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Brgy. {{BARANGAY_NAME}}, {{LGU_NAME}}"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="priceRange" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Price / Rate Info
                                    </Label>
                                    <Input
                                        id="priceRange"
                                        name="priceRange"
                                        defaultValue={editingData?.priceRange || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="₱ 1,500 - ₱ 5,000 per night"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="contactNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Contact Number
                                    </Label>
                                    <Input
                                        id="contactNumber"
                                        name="contactNumber"
                                        defaultValue={editingData?.contactNumber || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="09XX-XXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="websiteUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Website / Booking Link
                                    </Label>
                                    <Input
                                        id="websiteUrl"
                                        name="websiteUrl"
                                        defaultValue={editingData?.websiteUrl || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="googleMapsUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Google Maps Link
                                    </Label>
                                    <Input
                                        id="googleMapsUrl"
                                        name="googleMapsUrl"
                                        defaultValue={editingData?.googleMapsUrl || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="https://maps.google.com/..."
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="amenities" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Amenities
                                    </Label>
                                    <Input
                                        id="amenities"
                                        name="amenities"
                                        defaultValue={editingData?.amenities || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Swimming Pool, Free Wi-Fi, Aircon..."
                                    />
                                </div>
                            </div>

                            {(currentBarangay || editingData?.barangay) && (
                                <input
                                    type="hidden"
                                    name="barangay"
                                    value={editingData?.barangay || currentBarangay || ""}
                                />
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Cover / Property Photo
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
                                <label
                                    htmlFor="imageFile"
                                    className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-100 dark:hover:bg-[#2a3040]/30 transition-all cursor-pointer group relative overflow-hidden min-h-[180px]"
                                    style={{ borderColor: `${themeColor}40` }}
                                >
                                    {imagePreview ? (
                                        <div className="absolute inset-0 w-full h-full">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-70 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-slate-900/80 text-white px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm">Change Cover Image</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: `${themeColor}1a` }}>
                                                <UploadCloud className="w-7 h-7" style={{ color: themeColor }} />
                                            </div>
                                            <p className="text-slate-900 dark:text-slate-200 font-bold text-base mb-1 tracking-tight">Click to upload photo</p>
                                            <p className="text-slate-500 dark:text-slate-500 text-xs">Support PNG, JPG or WEBP for resort highlights</p>
                                        </>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="imageFile"
                                        name="imageFile"
                                        accept="image/*"
                                        className="opacity-0 absolute w-0 h-0"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setIsImageRemoved(false);
                                                const url = URL.createObjectURL(file);
                                                setImagePreview(url);
                                            }
                                        }}
                                    />
                                </label>
                                <input
                                    type="hidden"
                                    name="imageRemoved"
                                    value={isImageRemoved ? "true" : "false"}
                                />
                                {editingData?.imageUrl && imagePreview === editingData.imageUrl && !isImageRemoved && (
                                    <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
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
                            form="accommodationForm"
                            disabled={loading}
                            className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{editingData ? "Update Tuluyan Details" : "Save Accommodation"}</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
