"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
    Send, 
    Image as ImageIcon, 
    X, 
    AlertCircle, 
    Loader2, 
    CheckCircle2, 
    LogIn,
    Plus,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addCommunityReport, getBarangayListWithIds } from "@/app/admin/actions";
import LocationPicker from "@/components/shared/LocationPicker";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ReportForm({ isMaintenanceActive = false }: { isMaintenanceActive?: boolean }) {
    const { data: session, status } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
    const [selectedBarangay, setSelectedBarangay] = useState<string>("");
    const [isBrgyDropdownOpen, setIsBrgyDropdownOpen] = useState(false);
    const [brgySearchQuery, setBrgySearchQuery] = useState("");
    const [showBrgyError, setShowBrgyError] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchBarangays() {
            try {
                const res = await getBarangayListWithIds();
                if (res.success && res.data) {
                    setBarangays(res.data);
                }
            } catch (err) {
                console.error("Failed to load barangays:", err);
            }
        }
        fetchBarangays();
    }, []);

    const handleLocationSelect = useCallback((lat: number, lng: number) => {
        setLocation({ lat, lng, address: `Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setImages(prev => [...prev, ...newFiles]);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        URL.revokeObjectURL(previews[index]);
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const [selectedCategory, setSelectedCategory] = useState<string>("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!session) {
            toast.error("Please sign in first!");
            return;
        }

        if (!selectedBarangay) {
            setShowBrgyError(true);
            setIsBrgyDropdownOpen(true);
            toast.error("Please select a Barangay!");
            const element = document.getElementById("barangay-select-container");
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        setIsSubmitting(true);
        const formElement = e.currentTarget;
        const formData = new FormData(formElement);
        
        // Handle "Others" category
        if (selectedCategory === "Others") {
            const customCategory = formData.get("customCategory") as string;
            if (!customCategory || customCategory.trim() === "") {
                toast.error("Please specify your category!");
                setIsSubmitting(false);
                return;
            }
            formData.set("category", `Other: ${customCategory}`);
        }

        formData.append("barangayId", selectedBarangay);
        images.forEach(image => formData.append("images", image));
        if (location) {
            formData.append("latitude", location.lat.toString());
            formData.append("longitude", location.lng.toString());
            formData.append("address", location.address);
        }

        try {
            const res = await addCommunityReport(formData);
            if (res.success) {
                toast.success("Report submitted successfully!", {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                });
                formElement.reset();
                setImages([]);
                setPreviews([]);
                setLocation(null);
                setSelectedCategory("");
                setSelectedBarangay("");
            } else {
                toast.error(res.error || "Failed to submit report");
            }
        } catch {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isMaintenanceActive) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-white/10 text-center gap-6"
            >
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">Reporting Offline</h4>
                    <p className="text-slate-400 text-sm font-medium italic max-w-xs">Online concern reporting is temporarily disabled for scheduled maintenance. For immediate emergencies, please call the hotlines.</p>
                </div>
            </motion.div>
        );
    }

    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-white/10">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Setting up...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-white/10 text-center gap-6"
            >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase italic tracking-tighter">Sign In Required</h4>
                    <p className="text-slate-400 text-sm font-medium italic max-w-xs">You need to be signed in to submit a local concern or report an issue.</p>
                </div>
                <Button 
                    onClick={() => window.location.href = "/auth/login"}
                    className="py-4 h-auto px-10 bg-primary hover:opacity-90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-primary/25 flex items-center gap-3"
                >
                    <LogIn className="w-4 h-4" /> Login Now
                </Button>
            </motion.div>
        );
    }

    return (
        <div id="reports" className="bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-white/10 p-8 shadow-2xl backdrop-blur-sm overflow-hidden transition-all duration-500">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Report <span className="text-primary">an Issue</span></h3>
                    <p className="text-slate-400 text-[11px] font-medium italic">Your concerns help us maintain a better Mapandan.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div id="barangay-select-container" className="space-y-2 relative">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1 opacity-50">Select Barangay</label>
                        <input type="hidden" name="barangayId" value={selectedBarangay} required />
                        <button
                            type="button"
                            onClick={() => {
                                setIsBrgyDropdownOpen(!isBrgyDropdownOpen);
                                if (showBrgyError) setShowBrgyError(false);
                            }}
                            className={cn(
                                "w-full h-14 bg-white/5 border rounded-2xl font-bold transition-all focus:outline-none focus:ring-1 focus:ring-primary text-white italic text-left px-5 flex items-center justify-between",
                                showBrgyError ? "border-red-500 ring-1 ring-red-500" : "border-white/10"
                            )}
                        >
                            <span>{barangays.find(b => b.id === selectedBarangay)?.name || "Select Barangay"}</span>
                            <span className="text-xs text-slate-400">▼</span>
                        </button>

                        {isBrgyDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-[110]" onClick={() => {
                                    setIsBrgyDropdownOpen(false);
                                    setBrgySearchQuery("");
                                }} />
                                <div className="absolute z-[120] top-full left-0 right-0 mt-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2 max-h-60 overflow-hidden">
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="text"
                                            placeholder="Search barangay..."
                                            value={brgySearchQuery}
                                            onChange={(e) => setBrgySearchQuery(e.target.value)}
                                            className="w-full h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-primary italic"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 max-h-40">
                                        {barangays
                                            .filter(b => b.name.toLowerCase().includes(brgySearchQuery.toLowerCase()))
                                            .length === 0 ? (
                                                <div className="p-3 text-center text-xs text-slate-400 italic">No barangays match search.</div>
                                            ) : (
                                                barangays
                                                    .filter(b => b.name.toLowerCase().includes(brgySearchQuery.toLowerCase()))
                                                    .map((b) => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedBarangay(b.id);
                                                                setIsBrgyDropdownOpen(false);
                                                                setBrgySearchQuery("");
                                                                setShowBrgyError(false);
                                                            }}
                                                            className="w-full text-left p-3 rounded-xl text-xs font-bold text-slate-350 hover:bg-white/5 hover:text-white transition-colors"
                                                        >
                                                            {b.name}
                                                        </button>
                                                    ))
                                            )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1 opacity-50">Issue Category</label>
                        <AnimatePresence mode="wait">
                            {selectedCategory !== "Others" ? (
                                <motion.div
                                    key="dropdown"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Select name="category" required onValueChange={setSelectedCategory} value={selectedCategory}>
                                        <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold transition-all focus:ring-primary text-white italic">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                                            <SelectItem value="Road Repair" className="font-bold italic py-3 cursor-pointer">Road Repair</SelectItem>
                                            <SelectItem value="Waste Management" className="font-bold italic py-3 cursor-pointer">Waste Management</SelectItem>
                                            <SelectItem value="Street Lights" className="font-bold italic py-3 cursor-pointer">Street Lights</SelectItem>
                                            <SelectItem value="Drainage Issue" className="font-bold italic py-3 cursor-pointer">Drainage Issue</SelectItem>
                                            <SelectItem value="Public Safety" className="font-bold italic py-3 cursor-pointer">Public Safety</SelectItem>
                                            <SelectItem value="Others" className="font-bold italic py-3 cursor-pointer">Others</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="custom-input"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="relative flex-1">
                                        <input
                                            name="customCategory"
                                            required
                                            autoFocus
                                            placeholder="Please specify the issue category..."
                                            className="w-full h-14 bg-primary/10 border border-primary/20 rounded-2xl px-5 font-bold text-white italic text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <input type="hidden" name="category" value="Others" />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelectedCategory("")}
                                        className="h-14 w-14 rounded-2xl border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 p-0"
                                        title="Back to categories"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1 opacity-50">Detail Description</label>
                        <Textarea 
                            name="description"
                            required
                            placeholder="What's the issue? Give us the details..." 
                            className="min-h-[100px] bg-white/5 border-white/10 rounded-2xl p-4 font-bold transition-all focus:ring-primary text-white italic resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Compact Photo Attachment Area */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1 opacity-50">Attach Photos</label>
                            
                            <div 
                                className="relative h-[150px] w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden group/upload"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    multiple 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleImageChange}
                                />
                                
                                {previews.length === 0 ? (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-full border border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group"
                                    >
                                        <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
                                            <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-white">Upload Photos</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Click to browse files</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0">
                                        <div className={cn(
                                            "grid w-full h-full gap-0.5",
                                            previews.length === 1 && "grid-cols-1",
                                            previews.length === 2 && "grid-cols-2",
                                            previews.length === 3 && "grid-cols-3",
                                            previews.length >= 4 && "grid-cols-2 grid-rows-2"
                                        )}>
                                            {previews.slice(0, 4).map((preview, i) => {
                                                const isLastCell = i === 3;
                                                const hasMore = previews.length > 4;
                                                return (
                                                    <div key={preview} className="relative w-full h-full overflow-hidden bg-slate-900 group/item">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                                                        {isLastCell && hasMore && (
                                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none">
                                                                <span className="text-xs font-black text-white">+{previews.length - 3}</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeImage(i);
                                                                }}
                                                                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Floating Plus Button to Add More Photos - styled with bg-primary */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                            className="absolute bottom-2 right-2 w-8 h-8 bg-primary hover:opacity-90 text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 z-30"
                                            title="Add more photos"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pinned Map Location Section */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1 opacity-50">Pin Location</label>
                            <div className="relative h-[150px] w-full rounded-2xl border border-white/10 overflow-hidden bg-slate-950">
                                <LocationPicker 
                                    value={location}
                                    onSelect={handleLocationSelect}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <Button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 h-auto bg-primary hover:opacity-90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isSubmitting ? "Submitting Report..." : "Submit Report"}
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            className="w-full py-4 h-auto border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] italic transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Link href="/user/reports">
                                <FileText className="w-4 h-4" />
                                View My Reports
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
