"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useEvents } from "../providers/EventsProvider";
import { useEventsForm } from "../hooks/useEventsForm";
import { motion, AnimatePresence } from "framer-motion";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Image as ImageIcon, X, Loader2, Calendar, Info, Clock, Phone, Map as MapIcon } from "lucide-react";

const categories = ["Festival", "Community", "Religious", "Sports", "Other"];

export function AddEventModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useEvents();
    const { handleSubmit, loading } = useEventsForm();
    const [selectedCategory, setSelectedCategory] = useState<string>("Community");
    const [otherCategory, setOtherCategory] = useState<string>("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");
    const [lat, setLat] = useState<string>("");
    const [lng, setLng] = useState<string>("");
    const [venueName, setVenueName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingData) {
            // Only set preview from data if NOT already uploading a new one locally
            if (editingData.imageUrl && !imagePreview?.startsWith("data:")) {
                setImagePreview(editingData.imageUrl);
            }

            // Handle editing existing category
            if (editingData.category) {
                if (categories.includes(editingData.category)) {
                    setSelectedCategory(editingData.category);
                    setOtherCategory("");
                } else {
                    setSelectedCategory("Other");
                    setOtherCategory(editingData.category);
                }
            }
            setGoogleMapsUrl(editingData.googleMapsUrl || "");
            setLat(editingData.latitude ? String(editingData.latitude) : "");
            setLng(editingData.longitude ? String(editingData.longitude) : "");
            setVenueName(editingData.venueName || "");
            setAddress(editingData.address || "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingData]);

    const extractCoordsFromUrl = (url: string) => {
        // Handle @lat,lng format (most common)
        const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

        // Handle !3dLat!4dLng (desktop internal format)
        const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (bangMatch) return { lat: bangMatch[1], lng: bangMatch[2] };

        // Handle query=lat,lng format
        const queryMatch = url.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (queryMatch) return { lat: queryMatch[1], lng: queryMatch[2] };

        // Handle dir/lat,lng format
        const dirMatch = url.match(/\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (dirMatch) return { lat: dirMatch[1], lng: dirMatch[2] };

        // Handle generic -34.123,150.123 (latitude,longitude) anywhere in URL
        const genericMatch = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (genericMatch) {
            // Check if it's not part of a zoom level or something else
            const latVal = parseFloat(genericMatch[1]);
            const lngVal = parseFloat(genericMatch[2]);
            // Mapandan is around 16, 120. Reasonable bounds for Mapandan/Pangasinan:
            // Lat: 15-17, Lng: 119-121
            if (latVal > 14 && latVal < 18 && lngVal > 118 && lngVal < 122) {
                return { lat: genericMatch[1], lng: genericMatch[2] };
            }
        }

        return null;
    };

    const extractVenueFromUrl = (url: string) => {
        // Handle /place/Venue+Name/ format
        const placeMatch = url.match(/\/place\/([^/@]+)/);
        if (placeMatch) {
            return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        }
        return null;
    };

    const handleGoogleMapsUrlChange = (url: string) => {
        setGoogleMapsUrl(url);

        // Extract Coordinates from URL
        const coords = extractCoordsFromUrl(url);
        if (coords) {
            setLat(coords.lat);
            setLng(coords.lng);
        }

        // Extract Venue Name
        const venue = extractVenueFromUrl(url);
        if (venue) {
            setVenueName(venue);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };


    // Format date for input[type="datetime-local"]
    const formatDateForInput = (dateInput: Date | string | undefined) => {
        if (!dateInput) return "";
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return date.toISOString().slice(0, 16);
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
                setImagePreview(null);
                setSelectedCategory("Community");
                setOtherCategory("");
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader
                        className="p-8 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}>
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Event Details" : "Create New Event"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    Share the upcoming happenings in Mapandan with the community.
                                </DialogDescription>
                            </div>
                        </div>
                        {/* ❌ Explicit Clickable Close (X) button */}
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setEditingData(null);
                                setImagePreview(null);
                                setSelectedCategory("Community");
                                setOtherCategory("");
                            }}
                            className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0 mt-[-8px]"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogHeader>

                    <div className="p-8 pb-28 overflow-y-auto custom-scrollbar">
                        <form id="eventForm" onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left Column: Event details */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 mb-2" style={{ color: themeColor }}>
                                        <Info className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Event Information</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Event Title</Label>
                                        <Input
                                            name="title"
                                            required
                                            defaultValue={editingData?.title || ""}
                                            placeholder="e.g. Schedule for Coastal Clean-up"
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-xl font-bold italic"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                        {(currentBarangay || editingData?.barangay) && (
                                            <input
                                                type="hidden"
                                                name="barangay"
                                                value={editingData?.barangay || currentBarangay || ""}
                                            />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold">Category</Label>
                                            <AnimatePresence mode="wait">
                                                {selectedCategory !== "Other" ? (
                                                    <motion.div
                                                        key="select-cat"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="w-full"
                                                    >
                                                        <Select
                                                            name="category_trigger"
                                                            value={selectedCategory}
                                                            onValueChange={(val) => {
                                                                setSelectedCategory(val);
                                                                if (val === "Other") setOtherCategory("");
                                                            }}
                                                        >
                                                            <SelectTrigger
                                                                className="!w-full !h-12 min-h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                                                style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                                                {categories.map(cat => (
                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="input-cat"
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="relative"
                                                    >
                                                        <Input
                                                            required
                                                            autoFocus
                                                            value={otherCategory}
                                                            onChange={(e) => setOtherCategory(e.target.value)}
                                                            placeholder="Specify Category..."
                                                            className="h-12 focus:ring-2 pr-12"
                                                            style={{ backgroundColor: `${themeColor}14`, borderColor: `${themeColor}40`, "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedCategory("Community");
                                                                setOtherCategory("");
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-slate-400"
                                                            style={{ color: themeColor }}
                                                            title="Back to Dropdown"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <input
                                                type="hidden"
                                                name="category"
                                                value={selectedCategory === "Other" ? otherCategory : selectedCategory}
                                            />
                                        </div>
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center">
                                                <Phone className="w-3 h-3 mr-1" /> Contact Info
                                            </Label>
                                            <Input
                                                name="contactNumber"
                                                defaultValue={editingData?.contactNumber || ""}
                                                placeholder="e.g. 0912-345-6789"
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> Start Date & Time
                                            </Label>
                                            <Input
                                                type="datetime-local"
                                                name="startDate"
                                                required
                                                defaultValue={formatDateForInput(editingData?.startDate)}
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> End Date & Time
                                            </Label>
                                            <Input
                                                type="datetime-local"
                                                name="endDate"
                                                required
                                                defaultValue={formatDateForInput(editingData?.endDate)}
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Event Description</Label>
                                        <Textarea
                                            name="description"
                                            defaultValue={editingData?.description || ""}
                                            placeholder="Provide more details about the event..."
                                            className="min-h-[120px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
                                            <span>Event Reminders</span>
                                            <span className="text-[9px] font-medium text-slate-400 normal-case">(One reminder per line)</span>
                                        </Label>
                                        <Textarea
                                            name="reminders"
                                            defaultValue={editingData?.reminders?.join("\n") || ""}
                                            placeholder="e.g.&#10;Bring your own water bottle&#10;Wear comfortable shoes&#10;Arrive 15 mins early"
                                            className="min-h-[120px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] resize-none text-xs leading-relaxed"
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Location & Image */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 mb-2" style={{ color: themeColor }}>
                                        <MapPin className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Venue & Media</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Venue Name</Label>
                                        <Input
                                            name="venueName"
                                            required
                                            value={venueName}
                                            onChange={(e) => setVenueName(e.target.value)}
                                            placeholder="e.g. Mapandan Municipal Plaza"
                                            className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Address / Barangay</Label>
                                        <Input
                                            name="address"
                                            required
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="e.g. Poblacion, Mapandan"
                                            className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase opacity-70">Latitude</Label>
                                            <Input
                                                name="latitude"
                                                type="number"
                                                step="any"
                                                value={lat}
                                                onChange={(e) => setLat(e.target.value)}
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase opacity-70">Longitude</Label>
                                            <Input
                                                name="longitude"
                                                type="number"
                                                step="any"
                                                value={lng}
                                                onChange={(e) => setLng(e.target.value)}
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                        </div>
                                    </div>


                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold flex items-center">
                                            <MapIcon className="w-3 h-3 mr-1" /> Google Maps URL
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                name="googleMapsUrl"
                                                value={googleMapsUrl}
                                                onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                                                placeholder="https://goo.gl/maps/..."
                                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => window.open('https://www.google.com/maps/@16.0287,120.4022,15z', '_blank')}
                                                className="h-12 w-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] shrink-0"
                                                style={{ color: themeColor }}
                                                title="Open Google Maps to find location"
                                            >
                                                <MapPin className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Image Upload</Label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group relative h-40 rounded-2xl border-2 border-dashed bg-slate-50 dark:bg-[#1a1f2e] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center"
                                            style={{ borderColor: `${themeColor}40` }}
                                        >
                                            {imagePreview ? (
                                                <>
                                                    { }
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button type="button" variant="secondary" size="sm" className="font-bold">Change Image</Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImagePreview(null);
                                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 transition-colors">
                                                    <ImageIcon className="w-10 h-10 mb-2" />
                                                    <p className="text-sm font-bold uppercase tracking-wide">Upload Photo</p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                name="imageFile"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                            />
                                            {editingData?.imageUrl && imagePreview === editingData.imageUrl && (
                                                <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="absolute left-0 right-0 bottom-0 z-50 p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0f1117] dark:via-[#0f1117]/95">
                        <Button
                            type="submit"
                            form="eventForm"
                            disabled={loading}
                            className="w-full h-12 text-white font-bold shadow-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: themeColor, boxShadow: `0 14px 28px -14px ${themeColor}` }}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                editingData ? "Update Event" : "Publish Event"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
