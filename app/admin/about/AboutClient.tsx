"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
    upsertAboutData,
} from "./actions";
import { compressImage } from "@/lib/image-compression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    History,
    UserCog,
    ImageIcon,
    Target,
} from "lucide-react";

interface AboutClientProps {
    aboutData: any;
    isBarangayAdmin: boolean;
    managedBarangay?: string | null;
    themeColor?: string;
}

export default function AboutClient({
    aboutData,
    isBarangayAdmin,
    managedBarangay,
    themeColor,
}: AboutClientProps) {
    return (
        <AboutManager
            aboutData={aboutData}
            isBarangayAdmin={isBarangayAdmin}
            barangayName={managedBarangay || undefined}
            themeColor={themeColor}
        />
    );
}

// Reusable Auto-Expanding Textarea Component
interface AutoGrowingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
}

function AutoGrowingTextarea({ value, onChange, className, ...props }: AutoGrowingTextareaProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustHeight = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    React.useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    React.useEffect(() => {
        window.addEventListener("resize", adjustHeight);
        return () => {
            window.removeEventListener("resize", adjustHeight);
        };
    }, [adjustHeight]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                if (onChange) onChange(e);
                adjustHeight();
            }}
            className={className}
            {...props}
        />
    );
}

// Sub-components: AboutManager
function AboutManager({
    aboutData,
    isBarangayAdmin,
    barangayName,
    themeColor = "#2563eb",
}: {
    aboutData: any,
    isBarangayAdmin: boolean,
    barangayName?: string,
    themeColor?: string,
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"narrative" | "pillars" | "leader">("narrative");

    const [history, setHistory] = useState(aboutData?.history || "");
    const [mission, setMission] = useState(aboutData?.mission || "");
    const [vision, setVision] = useState(aboutData?.vision || "");
    const [coreValues, setCoreValues] = useState(aboutData?.coreValues || "");
    const [geo, setGeo] = useState(aboutData?.geographyOrDemographics || "");
    const [leaderName, setLeaderName] = useState(
        (isBarangayAdmin ? aboutData?.captainName : aboutData?.mayorName) || ""
    );
    const [message, setMessage] = useState(
        (isBarangayAdmin ? aboutData?.captainMessage : aboutData?.mayorMessage) || ""
    );

    React.useEffect(() => {
        setHistory(aboutData?.history || "");
        setMission(aboutData?.mission || "");
        setVision(aboutData?.vision || "");
        setCoreValues(aboutData?.coreValues || "");
        setGeo(aboutData?.geographyOrDemographics || "");
        setLeaderName((isBarangayAdmin ? aboutData?.captainName : aboutData?.mayorName) || "");
        setMessage((isBarangayAdmin ? aboutData?.captainMessage : aboutData?.mayorMessage) || "");
    }, [aboutData, isBarangayAdmin]);

    const [leaderFile, setLeaderFile] = useState<File | null>(null);
    const [leaderPreview, setLeaderPreview] = useState<string | null>(
        (isBarangayAdmin ? aboutData?.captainImageUrl : aboutData?.mayorImageUrl) || null
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append("history", history);
            formData.append("mission", mission);
            formData.append("vision", vision);
            formData.append("coreValues", coreValues);
            formData.append("geographyOrDemographics", geo);

            if (isBarangayAdmin) {
                formData.append("barangayName", barangayName || "");
                formData.append("captainName", leaderName);
                formData.append("captainMessage", message);
                if (leaderFile) {
                    const compressed = await compressImage(leaderFile, 1400, 0.82);
                    formData.append("captain-image", compressed);
                }
                formData.append("captainImageUrl", leaderPreview || "");
            } else {
                formData.append("mayorName", leaderName);
                formData.append("mayorMessage", message);
                if (leaderFile) {
                    const compressed = await compressImage(leaderFile, 1400, 0.82);
                    formData.append("mayor-image", compressed);
                }
                formData.append("mayorImageUrl", leaderPreview || "");
            }

            const res = await upsertAboutData(formData);
            if (res.success) {
                toast.success("Info updated successfully!");
            } else {
                toast.error(res.error || "Failed to update");
            }
        } catch {
            toast.error("Failed to update");
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: "narrative", label: "Heritage & Narrative", icon: History },
        { id: "pillars", label: "Pillars & Direction", icon: Target },
        { id: "leader", label: isBarangayAdmin ? "Captain's Corner" : "Mayor's Corner", icon: UserCog }
    ];

    return (
        <Card className="border-slate-200 dark:border-[#2a3040] shadow-xl overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#1e2330]">
            <CardHeader className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-[#2a3040] p-5 md:p-6 px-4 md:px-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter">
                    <History className="w-6 h-6" style={{ color: themeColor }} />
                    {isBarangayAdmin ? "Barangay Background" : "Municipal Background"}
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                    Update the official narrative and foundational pillars.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-6 lg:px-8 space-y-8">

                {/* Modern Premium Tabs Selector */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-black/40 rounded-[1.5rem] border border-slate-200/50 dark:border-[#2a3040]/50 max-w-2xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${isActive
                                    ? "bg-white dark:bg-[#1e2330] shadow-md scale-[1.02]"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
                                    }`}
                                style={isActive ? { color: themeColor } : undefined}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab 1: Heritage & Narrative */}
                {activeTab === "narrative" && (
                    <div className="space-y-8 transition-all duration-300 ease-out">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Historical Narrative</Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Heritage Story</span>
                            </div>
                            <AutoGrowingTextarea
                                value={history}
                                onChange={(e) => setHistory(e.target.value)}
                                className="w-full min-h-[300px] p-6 md:p-8 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base md:text-lg focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 shadow-inner font-medium resize-none overflow-hidden"
                                placeholder="Tell the story of our heritage..."
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                    {isBarangayAdmin ? "Demographics & Local Statistics" : "Geography & Fact Sheet"}
                                </Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Quick facts</span>
                            </div>
                            <AutoGrowingTextarea
                                value={geo}
                                onChange={(e) => setGeo(e.target.value)}
                                className="w-full min-h-[200px] p-6 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 shadow-inner font-medium resize-none overflow-hidden"
                                placeholder="Specify population data, geographic area boundaries..."
                            />
                        </div>
                    </div>
                )}

                {/* Tab 2: Pillars & Direction */}
                {activeTab === "pillars" && (
                    <div className="space-y-8 transition-all duration-300 ease-out">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Official Mission</Label>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Mission</span>
                                </div>
                                <AutoGrowingTextarea
                                    value={mission}
                                    onChange={(e) => setMission(e.target.value)}
                                    className="w-full min-h-[180px] p-6 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner font-medium resize-none overflow-hidden"
                                    placeholder="State the core mission of our administration..."
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Official Vision</Label>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Vision</span>
                                </div>
                                <AutoGrowingTextarea
                                    value={vision}
                                    onChange={(e) => setVision(e.target.value)}
                                    className="w-full min-h-[180px] p-6 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner font-medium resize-none overflow-hidden"
                                    placeholder="Describe the long-term vision of our town/barangay..."
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Core Guiding Principles & Values</Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Core Values</span>
                            </div>
                            <AutoGrowingTextarea
                                value={coreValues}
                                onChange={(e) => setCoreValues(e.target.value)}
                                className="w-full min-h-[200px] p-6 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner font-medium resize-none overflow-hidden"
                                placeholder="e.g. Integrity, Service, Excellence..."
                            />
                        </div>
                    </div>
                )}

                {/* Tab 3: Leadership Corner */}
                {activeTab === "leader" && (
                    <div className="space-y-8 transition-all duration-300 ease-out">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

                            {/* Photo Upload Container */}
                            <div className="w-full lg:w-[320px] flex flex-col items-center gap-4 shrink-0 mx-auto">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 self-start">Official Leadership Portrait</Label>
                                <div className="w-full aspect-[3/4] rounded-[2rem] bg-slate-100 dark:bg-black/40 border-2 border-dashed border-slate-200 dark:border-[#2a3040] overflow-hidden relative group shadow-inner flex items-center justify-center">
                                    {leaderPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={leaderPreview} alt="Leader" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="text-center opacity-30 space-y-2">
                                            <UserCog className="w-16 h-16 mx-auto text-slate-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">No Portrait Uploaded</p>
                                        </div>
                                    )}
                                    <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all">
                                        <ImageIcon className="w-10 h-10 text-white mb-2" />
                                        <span className="text-xs font-black text-white uppercase tracking-widest">Update Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) { setLeaderFile(f); setLeaderPreview(URL.createObjectURL(f)); }
                                        }} />
                                    </label>
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 text-center leading-tight">Recommended: Portrait Aspect Ratio (3:4) for clean integration</span>
                            </div>

                            {/* Leadership Info & Message */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Full Official Name & Title</Label>
                                    <Input
                                        value={leaderName || ""}
                                        onChange={(e) => setLeaderName(e.target.value)}
                                        placeholder={isBarangayAdmin ? "e.g. Hon. Jane Doe" : "e.g. Hon. John Doe"}
                                        className="h-16 rounded-[1.2rem] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] text-base font-bold text-slate-800 dark:text-white px-6 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Official Advocacy / Public Message</Label>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full uppercase tracking-wider">Resident message</span>
                                    </div>
                                    <AutoGrowingTextarea
                                        value={message || ""}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full min-h-[250px] p-6 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-black/20 text-base focus:ring-2 focus:ring-blue-500/20 transition-all outline-none leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 shadow-inner font-medium resize-none overflow-hidden"
                                        placeholder="A personal message to your Residents..."
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Always Anchored Publishing Action */}
                <div className="pt-8 border-t border-slate-100 dark:border-[#2a3040]">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-16 text-white rounded-[1.5rem] font-black uppercase tracking-widest active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 border-none"
                        style={{
                            backgroundColor: themeColor,
                            boxShadow: `0 10px 25px -5px ${themeColor}40`
                        }}
                    >
                        {isSaving ? "Updating Heritage..." : "Publish Content Updates"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
