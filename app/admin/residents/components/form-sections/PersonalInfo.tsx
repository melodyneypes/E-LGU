"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GENDERS, CIVIL_STATUSES, RELIGIONS, BLOOD_TYPES } from "../../constants";
import { useState, useEffect } from "react";
import { getResidentCategories } from "../../../actions";
import { useResident, Resident } from "../../providers/ResidentProvider";
import { Search } from "lucide-react";

interface ResidentCategory {
    id: string;
    name: string;
}

export function PersonalInfoSection({ data }: { data?: Partial<Resident> }) {
    const { 
        formCategoryId: selectedId, 
        setFormCategoryId: setSelectedId,
        setFormCategoryName,
        formCategoryName,
        themeColor
    } = useResident();

    const isNonResident = formCategoryName?.toUpperCase().replace("-", " ").includes("NON RESIDENT");

    const [genderVal, setGenderVal] = useState(() => {
        if (!data?.gender) return "Male";
        return GENDERS.includes(data.gender) ? data.gender : "Other";
    });
    const [civilStatusVal, setCivilStatusVal] = useState(() => {
        if (!data?.civilStatus) return "Single";
        return CIVIL_STATUSES.includes(data.civilStatus) ? data.civilStatus : "Other";
    });

    const [religionVal, setReligionVal] = useState(() => {
        if (!data?.religion) return "";
        const upper = data.religion.toUpperCase().trim();
        return RELIGIONS.includes(upper) ? upper : "OTHER";
    });
    const [religionSearch, setReligionSearch] = useState("");

    const [bloodTypeVal, setBloodTypeVal] = useState(() => {
        if (!data?.bloodType) return "";
        const upper = data.bloodType.toUpperCase().trim();
        return BLOOD_TYPES.includes(upper) ? upper : "OTHER";
    });
    const [bloodSearch, setBloodSearch] = useState("");

    const [dob, setDob] = useState(data?.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : "");

    const calculateAge = (birthDateStr: string) => {
        if (!birthDateStr) return "";
        const birth = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age.toString();
    };

    const age = calculateAge(dob);
    const [categories, setCategories] = useState<ResidentCategory[]>([]);

    useEffect(() => {
        getResidentCategories().then((res: { success: boolean; categories?: ResidentCategory[]; error?: string }) => {
            if (res.success && res.categories) {
                setCategories(res.categories);
            }
        });
    }, []);

    const selectCategory = (id: string, name: string) => {
        if (selectedId === id) {
            setSelectedId(null);
            setFormCategoryName(null);
        } else {
            setSelectedId(id);
            setFormCategoryName(name);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4 pb-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Resident Categories <span className="text-red-500">*</span></label>
                    <span style={{ color: themeColor }} className="text-[10px] font-bold uppercase">Select a category</span>
                </div>
                <div className="flex flex-wrap gap-2 p-1 transition-all duration-300 rounded-2xl">
                    {categories.map(cat => {
                        const isSelected = selectedId === cat.id;
                        return (
                            <div 
                                key={cat.id} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    selectCategory(cat.id, cat.name);
                                }}
                                style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` } : undefined}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none group ${
                                    isSelected
                                    ? 'text-white scale-105'
                                    : 'bg-white border-slate-200 text-slate-600 dark:bg-[#1a1f2e] dark:border-[#2a3040] dark:text-slate-400 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected ? 'bg-white border-white' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                    {isSelected && <div style={{ backgroundColor: themeColor }} className="w-2 h-2 rounded-full animate-in zoom-in-50 duration-200" />}
                                </div>
                                <span className="text-xs font-black uppercase tracking-tight">
                                    {cat.name}
                                </span>
                            </div>
                        );
                    })}
                    {categories.length === 0 && (
                        <div className="flex items-center gap-2 text-slate-400 italic text-xs py-2">
                             Initializing system categories...
                        </div>
                    )}
                    <input type="hidden" name="categories" value={selectedId || ""} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Last Name <span className="text-red-500">*</span></label>
                    <Input name="lastName" defaultValue={data?.lastName || ""} placeholder="e.g. DELA CRUZ" className="uppercase font-bold" required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">First Name <span className="text-red-500">*</span></label>
                    <Input name="firstName" defaultValue={data?.firstName || ""} placeholder="e.g. JUAN" className="uppercase font-bold" required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Middle Name</label>
                    <Input name="middleName" defaultValue={data?.middleName || ""} placeholder="e.g. RAMOS" className="uppercase font-bold" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Suffix</label>
                    <Input name="suffix" defaultValue={data?.suffix || ""} placeholder="e.g. JR, III" className="uppercase font-bold" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                        Gender <span className="text-red-500">*</span>
                    </label>
                    {genderVal === "Other" ? (
                        <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <Input 
                                name="gender" 
                                placeholder="Specify gender" 
                                defaultValue={(data?.gender === "Other" ? "" : data?.gender) || ""}
                                required 
                                style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                                className="h-10 font-bold focus-visible:ring-1 uppercase"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => setGenderVal(GENDERS[0])}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                style={{ color: themeColor }}
                                title="Back to list"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                            </button>
                        </div>
                    ) : (
                        <Select 
                            name="gender" 
                            onValueChange={(val) => setGenderVal(val)}
                            defaultValue={data?.gender || "Male"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                                {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Date of Birth <span className="text-red-500">*</span></label>
                    <Input 
                        name="dateOfBirth" 
                        type="date" 
                        value={dob} 
                        onChange={(e) => setDob(e.target.value)} 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Age</label>
                    <Input name="age" type="number" value={age} readOnly style={{ color: themeColor }} className="bg-slate-50 cursor-not-allowed font-bold" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                        Civil Status <span className="text-red-500">*</span>
                    </label>
                    {civilStatusVal === "Other" ? (
                        <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <Input 
                                name="civilStatus" 
                                placeholder="Specify status" 
                                defaultValue={(data?.civilStatus === "Other" ? "" : data?.civilStatus) || ""}
                                required 
                                style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                                className="h-10 font-bold focus-visible:ring-1 uppercase"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => setCivilStatusVal(CIVIL_STATUSES[0])}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                style={{ color: themeColor }}
                                title="Back to list"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                            </button>
                        </div>
                    ) : (
                        <Select 
                            name="civilStatus" 
                            onValueChange={(val) => setCivilStatusVal(val)}
                            defaultValue={data?.civilStatus || "Single"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {CIVIL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Place of Birth {!isNonResident && <span className="text-red-500">*</span>}</label>
                    <Input name="placeOfBirth" defaultValue={data?.placeOfBirth || ""} placeholder="City/Municipality, Province" className="uppercase font-bold" required={!isNonResident} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Citizenship</label>
                    <Input name="citizenship" defaultValue={data?.citizenship || "Filipino"} placeholder="e.g. Filipino" className="uppercase font-bold" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                        Religion
                    </label>
                    {religionVal === "OTHER" ? (
                        <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <Input 
                                name="religion" 
                                placeholder="Specify religion" 
                                defaultValue={(data?.religion === "OTHER" ? "" : data?.religion) || ""}
                                required 
                                style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                                className="h-10 font-bold focus-visible:ring-1 uppercase"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => {
                                    setReligionVal("");
                                    setReligionSearch("");
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                style={{ color: themeColor }}
                                title="Back to list"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                            </button>
                        </div>
                    ) : (
                        <Select 
                            name="religion" 
                            value={religionVal}
                            onValueChange={setReligionVal}
                            onOpenChange={(open) => {
                                if (!open) setReligionSearch("");
                            }}
                        >
                            <SelectTrigger className="h-10 font-semibold">
                                <SelectValue placeholder="Select Religion" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] flex flex-col p-0" position="popper">
                                <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] sticky top-0 z-20">
                                    <div className="relative flex items-center">
                                        <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search religion..."
                                            value={religionSearch}
                                            onChange={(e) => setReligionSearch(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#2a3040] rounded-lg outline-none focus:border-slate-300 dark:focus:border-white/20 font-semibold"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-[220px] p-1">
                                    {RELIGIONS.filter(r => r.toLowerCase().includes(religionSearch.toLowerCase())).length > 0 ? (
                                        RELIGIONS.filter(r => r.toLowerCase().includes(religionSearch.toLowerCase())).map(r => (
                                            <SelectItem key={r} value={r} className="font-bold text-xs uppercase">{r}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">No religion found</div>
                                    )}
                                </div>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                        Blood Type
                    </label>
                    {bloodTypeVal === "OTHER" ? (
                        <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <Input 
                                name="bloodType" 
                                placeholder="Specify blood type" 
                                defaultValue={(data?.bloodType === "OTHER" ? "" : data?.bloodType) || ""}
                                required 
                                style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                                className="h-10 font-bold focus-visible:ring-1 uppercase"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => {
                                    setBloodTypeVal("");
                                    setBloodSearch("");
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                style={{ color: themeColor }}
                                title="Back to list"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                            </button>
                        </div>
                    ) : (
                        <Select 
                            name="bloodType" 
                            value={bloodTypeVal}
                            onValueChange={setBloodTypeVal}
                            onOpenChange={(open) => {
                                if (!open) setBloodSearch("");
                            }}
                        >
                            <SelectTrigger className="h-10 font-semibold">
                                <SelectValue placeholder="Select Blood Type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] flex flex-col p-0" position="popper">
                                <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] sticky top-0 z-20">
                                    <div className="relative flex items-center">
                                        <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search blood type..."
                                            value={bloodSearch}
                                            onChange={(e) => setBloodSearch(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#2a3040] rounded-lg outline-none focus:border-slate-300 dark:focus:border-white/20 font-semibold"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-[220px] p-1">
                                    {BLOOD_TYPES.filter(b => b.toLowerCase().includes(bloodSearch.toLowerCase())).length > 0 ? (
                                        BLOOD_TYPES.filter(b => b.toLowerCase().includes(bloodSearch.toLowerCase())).map(b => (
                                            <SelectItem key={b} value={b} className="font-bold text-xs uppercase">{b}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">No blood type found</div>
                                    )}
                                </div>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold">Height (cm)</label>
                    <Input name="height" type="number" defaultValue={data?.height || ""} placeholder="e.g. 170" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Weight (kg)</label>
                    <Input name="weight" type="number" defaultValue={data?.weight || ""} placeholder="e.g. 65" />
                </div>
            </div>
        </div>
    );
}
