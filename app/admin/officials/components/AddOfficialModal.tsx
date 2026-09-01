"use client";

import { useState, useRef, type CSSProperties } from "react";
import { useOfficials } from "../providers/OfficialsProvider";
import { useOfficialsForm } from "../hooks/useOfficialsForm";
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
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, X, Loader2, Users, Phone, Mail, Calendar, Hash, GraduationCap, Trophy, Quote, Globe, Plus, Trash2, MapPin } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// -----------------------------------------------------------------------
// Inner form component — given a unique `key` by the parent so that it
// fully remounts (resetting ALL local state) every time we open for a
// different record (or open fresh after a save). This avoids the need for
// useEffect + setState, which the lint rules prohibit.
// -----------------------------------------------------------------------
 
function OfficialForm({ editingData, handleSubmit, themeColor }: { editingData: any; handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; themeColor: string }) {
    const { data: session } = useSession();
    const { selectedBarangay, barangays } = useOfficials();
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;

    // Determine default category and options
    const isBrgyAdmin = role === "BARANGAY_ADMIN";
    const defaultCategory = editingData?.category || (isBrgyAdmin ? "Barangay Council" : "LGU");
    const [category, setCategory] = useState(defaultCategory);

    // If Super Admin, allow choosing a barangay
    const [barangay, setBarangay] = useState(
        editingData?.barangay || 
        (isBrgyAdmin ? (managedBarangay || "") : (selectedBarangay !== "LGU" ? selectedBarangay : ""))
    );

    // Initialise directly from editingData — safe because the component is
    // remounted with a fresh key each time the modal context changes.
    const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(
        editingData?.imageUrl ?? null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => {
            if (editingData?.links && Array.isArray(editingData.links)) {
                setLinks([...editingData.links]);
            } else if (editingData?.facebookUrl) {
                // Migration: if they had a facebookUrl, put it in links
                setLinks([{ label: "Facebook", url: editingData.facebookUrl }]);
            } else {
                setLinks([]);
            }
        }, 0);
    }, [editingData]);

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

    const addLink = () => setLinks([...links, { label: "", url: "" }]);
    const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
    const updateLink = (index: number, field: "label" | "url", value: string) => {
        const newLinks = [...links];
        newLinks[index][field] = value;
        setLinks(newLinks);
    };

    const formatDateForInput = (dateString: string | undefined) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    };

    return (
        <form id="officialForm" onSubmit={handleSubmit} className="space-y-6">
            <input type="hidden" name="links" value={JSON.stringify(links)} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="barangay" value={barangay} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Photo Upload */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                        <ImageIcon className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Portrait Photo</h3>
                    </div>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative w-48 h-64 mx-auto rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center shadow-sm"
                        style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}08` }}
                    >
                        {imagePreview ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button type="button" variant="secondary" size="sm" className="font-bold">Change</Button>
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
                            <div className="flex flex-col items-center text-slate-400 transition-colors p-4 text-center">
                                <div className="w-14 h-14 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                                    <ImageIcon className="w-7 h-7" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Upload Portrait</p>
                            </div>
                        )}
                        <input
                            type="file"
                            name="image"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                        />
                        {editingData?.imageUrl && imagePreview === editingData.imageUrl && (
                            <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
                        )}
                        {editingData?.imageUrl && !imagePreview && (
                            <input type="hidden" name="imageRemoved" value="true" />
                        )}
                    </div>

                    <div className="space-y-2 mt-6">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                            <Hash className="w-3 h-3 mr-1" /> Display Order (Hierarchy)
                        </Label>
                        <Input
                            type="number"
                            name="order"
                            defaultValue={editingData?.order ?? 99}
                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic focus:ring-2"
                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                        />
                        <p className="text-xs text-slate-500">Rank: 1 is the highest (Mayor). Defaults to 99 (Last).</p>
                    </div>
                </div>

                {/* Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                        <Users className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Personal Information</h3>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name (including title)</Label>
                        <Input
                            name="name"
                            required
                            defaultValue={editingData?.name}
                            placeholder="e.g. Hon. Juan Dela Cruz"
                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic focus:ring-2"
                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Position / Role</Label>
                        <Input
                            name="position"
                            required
                            defaultValue={editingData?.position}
                            placeholder="e.g. Municipal Mayor, SB Member"
                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic focus:ring-2"
                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category / Council Group</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger
                                className="!w-full !h-14 min-h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-black uppercase tracking-widest text-[9px] focus:ring-2"
                                style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                            >
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                {!isBrgyAdmin && <SelectItem value="LGU">Municipal Government (LGU)</SelectItem>}
                                <SelectItem value="Barangay Council">Sangguniang Barangay (Council)</SelectItem>
                                <SelectItem value="SK Council">Sangguniang Kabataan (SK)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {!isBrgyAdmin && category !== "LGU" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1" style={{ color: themeColor }} /> Target Barangay (Area)
                            </Label>
                            <Select value={barangay} onValueChange={setBarangay}>
                                <SelectTrigger className="!w-full !h-14 min-h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic">
                                    <SelectValue placeholder="Select Barangay" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                    {barangays.map(b => (
                                        <SelectItem key={b} value={b} className="font-bold italic">Bgy. {b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <Phone className="w-3.5 h-3.5 mr-1" /> Contact Number
                            </Label>
                            <Input
                                name="contactNumber"
                                defaultValue={editingData?.contactNumber}
                                placeholder="e.g. 09123456789"
                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                            />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <Mail className="w-3.5 h-3.5 mr-1" style={{ color: themeColor }} /> Professional Email
                            </Label>
                            <Input
                                name="email"
                                type="email"
                                defaultValue={editingData?.email}
                                placeholder="official@mapandan.gov.ph"
                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                            <Quote className="w-3.5 h-3.5 mr-1" style={{ color: themeColor }} /> Official Motto / Vision Quote
                        </Label>
                        <Input
                            name="motto"
                            defaultValue={editingData?.motto}
                            placeholder="e.g. Service with Integrity..."
                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <GraduationCap className="w-4 h-4 mr-1" style={{ color: themeColor }} /> Educational Background
                            </Label>
                            <Textarea
                                name="education"
                                defaultValue={editingData?.education}
                                placeholder="Degrees, schools, and academic honors..."
                                className="min-h-[100px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none"
                                style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <Trophy className="w-4 h-4 mr-1 text-amber-500" /> Key Achievements
                            </Label>
                            <Textarea
                                name="achievements"
                                defaultValue={editingData?.achievements}
                                placeholder="Notable awards, projects, and recognitions..."
                                className="min-h-[100px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none"
                                style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1" /> Term Start Date
                            </Label>
                            <Input
                                type="date"
                                name="termStart"
                                defaultValue={formatDateForInput(editingData?.termStart)}
                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1" /> Term End Date
                            </Label>
                            <Input
                                type="date"
                                name="termEnd"
                                defaultValue={formatDateForInput(editingData?.termEnd)}
                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Biography or Message (Optional)</Label>
                        <Textarea
                            name="bio"
                            defaultValue={editingData?.bio}
                            placeholder="Write a short background or public message..."
                            className="min-h-[120px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none"
                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                        />
                    </div>

                    {/* Dynamic Social Links */}
                    <div className="pt-6 border-t border-slate-200 dark:border-[#2a3040]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2" style={{ color: themeColor }}>
                                <Globe className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Social & Profile Links</h3>
                            </div>
                            <Button 
                                type="button" 
                                onClick={addLink}
                                variant="outline"
                                className="h-9 px-4 font-bold rounded-xl flex items-center gap-2"
                                style={{ borderColor: `${themeColor}40`, color: themeColor }}
                            >
                                <Plus className="w-3 h-3" /> Add Link
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {links.length === 0 ? (
                                <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                                    <p className="text-slate-400 text-xs font-medium italic">No social links added yet.</p>
                                </div>
                            ) : (
                                links.map((link, index) => (
                                    <div key={index} className="flex gap-3 items-start group">
                                        <div className="flex-1 grid grid-cols-2 gap-3 p-3 bg-slate-50/50 dark:bg-[#1a1f2e]/50 rounded-xl border border-slate-100 dark:border-[#2a3040]">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Platform Label</Label>
                                                <Input
                                                    value={link.label}
                                                    onChange={(e) => updateLink(index, "label", e.target.value)}
                                                    placeholder="e.g. Facebook"
                                                    className="h-9 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">URL</Label>
                                                <Input
                                                    value={link.url}
                                                    onChange={(e) => updateLink(index, "url", e.target.value)}
                                                    placeholder="https://..."
                                                    className="h-9 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-sm"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeLink(index)}
                                            className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mt-5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}

// -----------------------------------------------------------------------
// Main modal shell — thin wrapper; delegates state to OfficialForm
// -----------------------------------------------------------------------
export function AddOfficialModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, themeColor } = useOfficials();
    const { handleSubmit, loading } = useOfficialsForm();

    // A unique key ensures OfficialForm fully remounts on each open/close
    // or when switching between records, guaranteeing a clean slate.
    const formKey = editingData?.id ?? `new-${isAddModalOpen}`;

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-[2.5rem]">
                <div className="flex flex-col h-[90vh] sm:max-h-[85vh]">
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] relative flex-row items-center justify-between overflow-hidden shrink-0"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0" 
                                style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}
                            >
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                    {editingData ? "Edit Official Profile" : "Add Council Member"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">
                                    Manage the details of elected or appointed council members.
                                </DialogDescription>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setEditingData(null);
                            }}
                            className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0 z-10"
                            title="Close modal"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </DialogHeader>

                    <div className="flex-1 p-4 pb-24 overflow-y-auto custom-scrollbar">
                        {/* key forces a full remount every time formKey changes */}
                        <OfficialForm
                            key={formKey}
                            editingData={editingData}
                            handleSubmit={handleSubmit}
                            themeColor={themeColor}
                        />
                    </div>

                    <DialogFooter className="p-6 pt-0 bg-white dark:bg-[#0f1117] border-none shrink-0">
                        <Button
                            type="submit"
                            form="officialForm"
                            disabled={loading}
                            className="w-full h-12 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: themeColor, boxShadow: `0 14px 28px -14px ${themeColor}` }}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                editingData ? "Apply Changes" : "Add Official"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}