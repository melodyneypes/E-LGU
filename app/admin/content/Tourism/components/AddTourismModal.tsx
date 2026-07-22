"use client";

import React, { useState, useEffect } from "react";
import { useTourism } from "../providers/TourismProvider";
import { useTourismForm } from "../hooks/useTourismForm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Compass, X, Save } from "lucide-react";

export function AddTourismModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useTourism();
    const { handleSubmit, loading } = useTourismForm();
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (editingData?.imageUrl) {
            setImagePreview(editingData.imageUrl);
        } else {
            setImagePreview(null);
        }
    }, [editingData, isAddModalOpen]);

    const handleClose = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
            setImagePreview(null);
        }, 200);
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
                                <Compass className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Tourism Spot" : "Add New Tourism Spot"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    {editingData ? "Modify the details of this attraction listing below." : "Enter the details for the new attraction listing below. It will be published immediately."}
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
                        <form key={editingData?.id || "new-tourism-form"} id="tourismForm" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Tourism Spot / Landmark Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editingData?.name || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="e.g. Mapandan Town Plaza & Park"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Category
                                    </Label>
                                    <Input
                                        id="category"
                                        name="category"
                                        defaultValue={editingData?.category || "Park"}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Park, Landmark, Historical, Nature..."
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
                                    placeholder="Describe key highlights, history, and activities..."
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
                                        placeholder="Brgy. Poblacion, Mapandan"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="entranceFee" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Entrance Fee Info
                                    </Label>
                                    <Input
                                        id="entranceFee"
                                        name="entranceFee"
                                        defaultValue={editingData?.entranceFee || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Free Admission / ₱ 50 per head"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="bestTimeToVisit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Best Time to Visit / Hours
                                    </Label>
                                    <Input
                                        id="bestTimeToVisit"
                                        name="bestTimeToVisit"
                                        defaultValue={editingData?.bestTimeToVisit || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Late Afternoon / 6:00 AM - 10:00 PM"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contactNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Contact Info / Tourism Desk
                                    </Label>
                                    <Input
                                        id="contactNumber"
                                        name="contactNumber"
                                        defaultValue={editingData?.contactNumber || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="0912 345 6789"
                                    />
                                </div>
                            </div>

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

                            {(currentBarangay || editingData?.barangay) && (
                                <input
                                    type="hidden"
                                    name="barangay"
                                    value={editingData?.barangay || currentBarangay || ""}
                                />
                            )}

                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Cover / Feature Image
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        name="imageFile"
                                        accept="image/*"
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setImagePreview(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                                {editingData?.imageUrl && imagePreview === editingData.imageUrl && (
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
                            form="tourismForm"
                            disabled={loading}
                            className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{editingData ? "Update Tourism Spot" : "Save Tourism Spot"}</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}