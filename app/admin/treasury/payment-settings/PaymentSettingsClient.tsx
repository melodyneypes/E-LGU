"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Search } from "lucide-react";
import { updateTransactionBaseFees } from "@/app/admin/settings/actions";

interface PaymentSettingsClientProps {
    transactionTypes: any[];
    themeColor?: string;
}

export default function PaymentSettingsClient({ 
    transactionTypes, 
    themeColor = "#2563eb" 
}: PaymentSettingsClientProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Service Fees State
    const [fees, setFees] = useState<Record<string, string>>(() => {
        return transactionTypes.reduce((acc, type) => {
            acc[type.id] = String(type.baseFee);
            return acc;
        }, {} as Record<string, string>);
    });

    const [studentFees, setStudentFees] = useState<Record<string, string>>(() => {
        return transactionTypes.reduce((acc, type) => {
            acc[type.id] = String(type.studentFee || 0);
            return acc;
        }, {} as Record<string, string>);
    });

    // Birth Registration Sub-Fees (fetched from defaultFees JSON)
    const [birthRegProcFee, setBirthRegProcFee] = useState<string>(() => {
        const birthReg = transactionTypes.find(t => t.code === "LCR_BIRTH_REG");
        if (birthReg?.defaultFees) {
            const arr = typeof birthReg.defaultFees === "string" ? JSON.parse(birthReg.defaultFees) : birthReg.defaultFees;
            return String(arr.find((f: any) => f.code === "PROCESSING_FEE")?.amount ?? 215);
        }
        return "215";
    });

    const [birthRegLate1, setBirthRegLate1] = useState<string>(() => {
        const birthReg = transactionTypes.find(t => t.code === "LCR_BIRTH_REG");
        if (birthReg?.defaultFees) {
            const arr = typeof birthReg.defaultFees === "string" ? JSON.parse(birthReg.defaultFees) : birthReg.defaultFees;
            return String(arr.find((f: any) => f.code === "LATE_FEE_1_10")?.amount ?? 315);
        }
        return "315";
    });

    const [birthRegLate10, setBirthRegLate10] = useState<string>(() => {
        const birthReg = transactionTypes.find(t => t.code === "LCR_BIRTH_REG");
        if (birthReg?.defaultFees) {
            const arr = typeof birthReg.defaultFees === "string" ? JSON.parse(birthReg.defaultFees) : birthReg.defaultFees;
            return String(arr.find((f: any) => f.code === "LATE_FEE_10_20")?.amount ?? 515);
        }
        return "515";
    });

    const [birthRegLate20, setBirthRegLate20] = useState<string>(() => {
        const birthReg = transactionTypes.find(t => t.code === "LCR_BIRTH_REG");
        if (birthReg?.defaultFees) {
            const arr = typeof birthReg.defaultFees === "string" ? JSON.parse(birthReg.defaultFees) : birthReg.defaultFees;
            return String(arr.find((f: any) => f.code === "LATE_FEE_20_UP")?.amount ?? 1015);
        }
        return "1015";
    });

    const [isSavingFees, setIsSavingFees] = useState(false);

    // Sync state when props change (revalidation updates)
    React.useEffect(() => {
        setFees(transactionTypes.reduce((acc, type) => {
            acc[type.id] = String(type.baseFee);
            return acc;
        }, {} as Record<string, string>));
        setStudentFees(transactionTypes.reduce((acc, type) => {
            acc[type.id] = String(type.studentFee || 0);
            return acc;
        }, {} as Record<string, string>));

        const birthReg = transactionTypes.find(t => t.code === "LCR_BIRTH_REG");
        if (birthReg?.defaultFees) {
            const arr = typeof birthReg.defaultFees === "string" ? JSON.parse(birthReg.defaultFees) : birthReg.defaultFees;
            setBirthRegProcFee(String(arr.find((f: any) => f.code === "PROCESSING_FEE")?.amount ?? 215));
            setBirthRegLate1(String(arr.find((f: any) => f.code === "LATE_FEE_1_10")?.amount ?? 315));
            setBirthRegLate10(String(arr.find((f: any) => f.code === "LATE_FEE_10_20")?.amount ?? 515));
            setBirthRegLate20(String(arr.find((f: any) => f.code === "LATE_FEE_20_UP")?.amount ?? 1015));
        }
    }, [transactionTypes]);

    const handleFeeChange = (id: string, value: string) => {
        setFees(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleStudentFeeChange = (id: string, value: string) => {
        setStudentFees(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSaveFees = async () => {
        setIsSavingFees(true);
        try {
            const feesList = Object.entries(fees).map(([id, baseFee]) => {
                const type = transactionTypes.find(t => t.id === id);
                const isCedula = type?.code?.includes("CEDULA");
                const isBirthReg = type?.code === "LCR_BIRTH_REG";
                return {
                    id,
                    baseFee: Number(baseFee) || 0,
                    ...(isCedula ? { studentFee: Number(studentFees[id]) || 0 } : {}),
                    ...(isBirthReg ? {
                        defaultFees: [
                            { code: "PROCESSING_FEE", label: "Processing & E-Copy Fee", amount: Number(birthRegProcFee) || 0 },
                            { code: "LATE_FEE_1_10", label: "Late Fee (1-10 Years)", amount: Number(birthRegLate1) || 0 },
                            { code: "LATE_FEE_10_20", label: "Late Fee (10-20 Years)", amount: Number(birthRegLate10) || 0 },
                            { code: "LATE_FEE_20_UP", label: "Late Fee (20+ Years)", amount: Number(birthRegLate20) || 0 }
                        ]
                    } : {})
                };
            });
            const res = await updateTransactionBaseFees(feesList);
            if (res.success) {
                toast.success("Service transaction base fees updated successfully!");
            } else {
                toast.error(res.error || "Failed to update fees");
            }
        } catch {
            toast.error("An error occurred while saving fees");
        } finally {
            setIsSavingFees(false);
        }
    };

    const filteredTransactionTypes = transactionTypes.filter(type => 
        type.isActive !== false && (
            type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (type.category && type.category.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <Card className="border-slate-200 dark:border-[#2a3040] shadow-xl overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#1e2330]">
                <CardHeader className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-[#2a3040] p-5 md:p-6 px-4 md:px-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter">
                                <Building2 className="w-6 h-6" style={{ color: themeColor }} />
                                Service Fee Registry
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                                Configure official base service charges live for citizen applications.
                            </CardDescription>
                        </div>
                        <div className="hidden md:block">
                            <Badge variant="outline" className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-200">
                                Encrypted Secure
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-6 lg:px-8 space-y-8">
                    <div className="space-y-8 transition-all duration-300 ease-out">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full shadow-md" style={{ backgroundColor: themeColor }} />
                                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Official Service Fee Listing</Label>
                            </div>
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    type="text"
                                    placeholder="Search services, codes, category..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] text-xs font-bold shadow-sm focus:ring-2 focus:ring-primary/20 w-full"
                                />
                            </div>
                        </div>

                        {filteredTransactionTypes.length === 0 ? (
                            <div className="text-center p-12 bg-slate-50 dark:bg-black/20 rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040]">
                                <p className="text-slate-500 font-medium italic">No service transactions match your search filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 dark:border-[#2a3040] shadow-sm bg-white dark:bg-black/10">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-black/40 border-b border-slate-200 dark:border-[#2a3040] font-black uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                                            <th className="p-4 pl-6">Service Code</th>
                                            <th className="p-4">Official Service Name</th>
                                            <th className="p-4">Department / Category</th>
                                            <th className="p-4 text-right pr-6">Base Fee (PHP)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactionTypes.map((type) => (
                                            <tr key={type.id} className="border-b border-slate-100 dark:border-[#2a3040] hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors font-medium">
                                                <td className="p-4 pl-6">
                                                    <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md uppercase border border-slate-200/50 dark:border-[#2a3040]/50">
                                                        {type.code}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 dark:text-slate-200 text-sm tracking-tight">{type.name}</span>
                                                        {type.description && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-sm xl:max-w-md">{type.description}</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full border border-slate-200/50 dark:border-[#2a3040]/50 tracking-wider">
                                                        {type.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <div className="relative inline-flex items-center max-w-[130px] ml-auto">
                                                            <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                            <Input 
                                                                type="number"
                                                                step="0.01"
                                                                value={fees[type.id] !== undefined ? fees[type.id] : ""}
                                                                onChange={(e) => handleFeeChange(type.id, e.target.value)}
                                                                className="h-11 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-sm shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                            />
                                                        </div>
                                                        {type.code?.includes("CEDULA") && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Student Fee:</span>
                                                                <div className="relative inline-flex items-center max-w-[130px]">
                                                                    <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                    <Input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={studentFees[type.id] !== undefined ? studentFees[type.id] : ""}
                                                                        onChange={(e) => handleStudentFeeChange(type.id, e.target.value)}
                                                                        className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {type.code === "LCR_BIRTH_REG" && (
                                                            <div className="flex flex-col gap-2 mt-2 w-full max-w-[280px]">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Processing Fee:</span>
                                                                    <div className="relative inline-flex items-center max-w-[130px]">
                                                                        <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                        <Input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={birthRegProcFee}
                                                                            onChange={(e) => setBirthRegProcFee(e.target.value)}
                                                                            className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Late Fee (1-10y):</span>
                                                                    <div className="relative inline-flex items-center max-w-[130px]">
                                                                        <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                        <Input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={birthRegLate1}
                                                                            onChange={(e) => setBirthRegLate1(e.target.value)}
                                                                            className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Late Fee (10-20y):</span>
                                                                    <div className="relative inline-flex items-center max-w-[130px]">
                                                                        <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                        <Input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={birthRegLate10}
                                                                            onChange={(e) => setBirthRegLate10(e.target.value)}
                                                                            className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Late Fee (20y+):</span>
                                                                    <div className="relative inline-flex items-center max-w-[130px]">
                                                                        <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                        <Input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={birthRegLate20}
                                                                            onChange={(e) => setBirthRegLate20(e.target.value)}
                                                                            className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <Separator className="bg-slate-100 dark:bg-[#2a3040]" />

                        {/* Save Service Fees Action */}
                        <div className="pt-2">
                            <Button
                                onClick={handleSaveFees}
                                disabled={isSavingFees}
                                className="w-full h-16 text-white rounded-[1.5rem] font-black uppercase tracking-widest active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 border-none"
                                style={{ 
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 25px -5px ${themeColor}40` 
                                }}
                            >
                                {isSavingFees ? "Publishing Fees..." : "Publish Service Fees"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Info */}
            <div className="max-w-3xl mx-auto text-center space-y-2 opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Mapandan Municipal Portal • Unified Treasury Services</p>
                <div className="h-0.5 w-12 bg-slate-300 dark:bg-white/10 mx-auto rounded-full" />
            </div>
        </div>
    );
}
