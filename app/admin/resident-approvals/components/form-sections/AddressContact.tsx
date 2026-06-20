"use client";

import { Users, X as XIcon, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { HeadSearch } from "../HeadSearch";
import { ResidentSearch } from "../ResidentSearch";
import { toast } from "sonner";
import { useResident, Resident } from "../../providers/ResidentProvider";
import { useSession } from "next-auth/react";
import { getBarangayList } from "../../../actions";

export function AddressContactSection({ data }: { data?: Partial<Resident> }) {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;
    const isBarangayAdmin = role === "BARANGAY_ADMIN";

    const { 
        currentFamilyMembers: familyMembers, 
        setCurrentFamilyMembers: setFamilyMembers,
        formCategoryName
    } = useResident();

    const defaultBrgy = data?.barangay || (isBarangayAdmin ? managedBarangay : "");

    const [isHead, setIsHead] = useState(data?.isHead || false);
    const [headInfo, setHeadInfo] = useState({ 
        id: data?.headId || "", 
        name: data?.headName || "" 
    });

    // Resident Type Logic (linked to Category)
    const [isGuest, setIsGuest] = useState(false);
    const [barangayList, setBarangayList] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBarangay, setSelectedBarangay] = useState(defaultBrgy);

    useEffect(() => {
        if (defaultBrgy && barangayList.length > 0) {
            const matched = barangayList.find(b => b.toLowerCase() === defaultBrgy.toLowerCase());
            if (matched) {
                setSelectedBarangay(matched);
                return;
            }
        }
        setSelectedBarangay(defaultBrgy);
    }, [defaultBrgy, barangayList]);

    const filteredBarangays = barangayList.filter(b => 
        b.toLowerCase().includes(searchQuery.toLowerCase()) || b === selectedBarangay
    );

    useEffect(() => {
        const fetchBarangays = async () => {
            const res = await getBarangayList();
            if (res.success && res.data && res.data.length > 0) {
                setBarangayList(res.data);
            }
        };
        fetchBarangays();
    }, []);

    // Sync isGuest with category selection
    useEffect(() => {
        if (formCategoryName?.toLowerCase().includes("guest")) {
            setIsGuest(true);
        } else {
            // Also check initial data if no category name is set yet (during mount)
            if (!formCategoryName && data?.municipality && data.municipality.toLowerCase() !== "mapandan") {
                setIsGuest(true);
            } else {
                setIsGuest(false);
            }
        }
    }, [formCategoryName, data?.municipality]);

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resident Address Context</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Category: <span className="text-blue-600 dark:text-blue-400 uppercase">{formCategoryName || "Not Specified"}</span>
                        </p>
                    </div>
                </div>
                {isGuest && (
                    <div className="mt-2 py-1 px-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-left-2 transition-all">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Guest Mode Active: Manual Address Entry Enabled
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold">House Number</label>
                    <Input name="houseNumber" defaultValue={data?.houseNumber || ""} placeholder="e.g. 123" className="uppercase" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Street</label>
                    <Input name="street" defaultValue={data?.street || ""} placeholder="e.g. RIZAL ST." className="uppercase" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Sitio</label>
                    <Input name="sitio" defaultValue={data?.sitio || ""} placeholder="e.g. MALIGAYA" className="uppercase" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Purok</label>
                    <Input name="purok" defaultValue={data?.purok || ""} placeholder="e.g. 1" className="uppercase" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-blue-600 dark:text-blue-400">Barangay <span className="text-red-500">*</span></label>
                    {isGuest ? (
                        <Input 
                            name="barangay" 
                            defaultValue={data?.barangay || ""} 
                            placeholder="Enter Village/Barangay" 
                            className="bg-orange-50/20 border-orange-200 focus:border-orange-500 uppercase font-black" 
                            required 
                        />
                    ) : (
                        isBarangayAdmin ? (
                            <>
                                <Input 
                                    value={managedBarangay || ""} 
                                    readOnly 
                                    className="bg-slate-50 dark:bg-slate-900 font-bold border-blue-100 dark:border-blue-900 cursor-not-allowed"
                                />
                                <input type="hidden" name="barangay" value={managedBarangay || ""} />
                            </>
                        ) : (
                             <Select 
                                 name="barangay" 
                                 value={selectedBarangay} 
                                 onValueChange={setSelectedBarangay}
                                 onOpenChange={(open) => {
                                     if (!open) setSearchQuery("");
                                 }}
                             >
                                 <SelectTrigger>
                                     <SelectValue placeholder="Select Barangay" />
                                 </SelectTrigger>
                                 <SelectContent className="max-h-[300px] flex flex-col p-0" position="popper">
                                     <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] sticky top-0 z-20">
                                         <div className="relative flex items-center">
                                             <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
                                             <input
                                                 type="text"
                                                 placeholder="Search barangay..."
                                                 value={searchQuery}
                                                 onChange={(e) => setSearchQuery(e.target.value)}
                                                 onKeyDown={(e) => {
                                                     e.stopPropagation();
                                                 }}
                                                 onPointerDown={(e) => {
                                                     e.stopPropagation();
                                                 }}
                                                 className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#2a3040] rounded-lg outline-none focus:border-slate-300 dark:focus:border-white/20 font-semibold"
                                             />
                                         </div>
                                     </div>
                                     <div className="overflow-y-auto max-h-[220px] p-1">
                                         {filteredBarangays.length > 0 ? (
                                             filteredBarangays.map(b => (
                                                 <SelectItem key={b} value={b}>{b}</SelectItem>
                                             ))
                                         ) : (
                                             <div className="p-4 text-center text-xs text-slate-400">No barangay found</div>
                                         )}
                                     </div>
                                 </SelectContent>
                             </Select>
                        )
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Municipality {isGuest && <span className="text-red-500">*</span>}</label>
                    {isGuest ? (
                        <Input 
                            name="municipality" 
                            defaultValue={data?.municipality || ""} 
                            placeholder="Enter City/Municipality" 
                            className="bg-orange-50/20 border-orange-200 focus:border-orange-500 uppercase font-black" 
                            required 
                        />
                    ) : (
                        <Input 
                            name="municipality" 
                            defaultValue={data?.municipality || "Mapandan"} 
                            readOnly 
                            className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-bold" 
                        />
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Province {isGuest && <span className="text-red-500">*</span>}</label>
                    {isGuest ? (
                        <Input 
                            name="province" 
                            defaultValue={data?.province || ""} 
                            placeholder="Enter Province" 
                            className="bg-orange-50/20 border-orange-200 focus:border-orange-500 uppercase font-black" 
                            required 
                        />
                    ) : (
                        <Input 
                            name="province" 
                            defaultValue={data?.province || "Pangasinan"} 
                            readOnly 
                            className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-bold" 
                        />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Mobile Number</label>
                    <Input name="contactNumber" defaultValue={data?.contactNumber || ""} placeholder="09XX XXX XXXX" />
                </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl space-y-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="isHead" 
                        name="isHead" 
                        checked={isHead}
                        onCheckedChange={(checked) => setIsHead(!!checked)}
                    />
                    <label htmlFor="isHead" className="text-sm font-bold text-blue-900 dark:text-blue-100 italic uppercase">
                        Check if this person is the HEAD OF THE HOUSEHOLD
                    </label>
                </div>

                {!isHead ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">Relationship to Head</label>
                            <Input name="relationshipToHead" defaultValue={data?.relationshipToHead || ""} placeholder="e.g. SPOUSE, SON, DAUGHTER" className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">Search Household Head</label>
                            <HeadSearch 
                                onSelect={(id: string, name: string) => setHeadInfo({ id, name })} 
                                defaultValue={headInfo.name} 
                            />
                            <input type="hidden" name="headId" value={headInfo.id} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Link Existing Family Members
                            </label>
                            <ResidentSearch 
                                onSelect={(resident: any) => {
                                    if (familyMembers.find(m => m.id === resident.id)) {
                                        toast.error("Resident already added to family list");
                                        return;
                                    }
                                    setFamilyMembers([...familyMembers, {
                                        id: resident.id,
                                        fullName: `${resident.firstName} ${resident.lastName}`,
                                        relationship: "",
                                        age: resident.age?.toString() || ""
                                    }]);
                                    toast.success(`${resident.firstName} added to family list`);
                                }}
                                placeholder="Search for a resident to add as family member..."
                                excludeIds={data?.id ? [data.id] : []}
                                suggestEmpty={true}
                            />
                        </div>
                        {familyMembers.length > 0 && (
                            <div className="bg-white dark:bg-black/20 rounded-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2">Name</th>
                                            <th className="px-4 py-2">Relationship</th>
                                            <th className="px-4 py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {familyMembers.map((member, idx) => (
                                            <tr key={member.id || idx}>
                                                <td className="px-4 py-2 font-bold">{member.fullName}</td>
                                                <td className="px-4 py-2">
                                                    <Input 
                                                        className="h-7 text-[10px] uppercase font-bold" 
                                                        placeholder="SPOUSE, SON, etc."
                                                        value={member.relationship}
                                                        onChange={(e) => {
                                                            const updated = [...familyMembers];
                                                            updated[idx].relationship = e.target.value;
                                                            setFamilyMembers(updated);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-red-500"
                                                        onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== idx))}
                                                    >
                                                        <XIcon className="w-3 h-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <input type="hidden" name="familyMembers" value={JSON.stringify(familyMembers)} />
                    </div>
                )}
            </div>
        </div>
    );
}
