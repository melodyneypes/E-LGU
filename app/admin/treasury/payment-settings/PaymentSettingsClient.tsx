"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Search, Plus, Trash2 } from "lucide-react";
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

    const [baseFeeLabels, setBaseFeeLabels] = useState<Record<string, string>>(() => {
        return transactionTypes.reduce((acc, type) => {
            if (type.category?.toLowerCase() === "civil registry") {
                let arr: any[] = [];
                if (type.defaultFees) {
                    arr = typeof type.defaultFees === "string" ? JSON.parse(type.defaultFees) : type.defaultFees;
                }
                const labelObj = arr.find((f: any) => f.code === "BASE_FEE_LABEL");
                acc[type.id] = labelObj?.label || "Misc Fee";
            }
            return acc;
        }, {} as Record<string, string>);
    });

    const [civilRegistryDefaultFees, setCivilRegistryDefaultFees] = useState<Record<string, { code: string; label: string; amount: string }[]>>(() => {
        return transactionTypes.reduce((acc, type) => {
            if (type.category?.toLowerCase() === "civil registry") {
                let arr: any[] = [];
                if (type.defaultFees) {
                    arr = typeof type.defaultFees === "string" ? JSON.parse(type.defaultFees) : type.defaultFees;
                }
                acc[type.id] = arr
                    .filter((f: any) => f.code !== "BASE_FEE_LABEL")
                    .map((f: any) => ({
                        code: f.code || `FEE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        label: f.label || "",
                        amount: String(f.amount ?? 0)
                    }));
            }
            return acc;
        }, {} as Record<string, { code: string; label: string; amount: string }[]>);
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

        setCivilRegistryDefaultFees(transactionTypes.reduce((acc, type) => {
            if (type.category?.toLowerCase() === "civil registry") {
                let arr: any[] = [];
                if (type.defaultFees) {
                    arr = typeof type.defaultFees === "string" ? JSON.parse(type.defaultFees) : type.defaultFees;
                }
                acc[type.id] = arr
                    .filter((f: any) => f.code !== "BASE_FEE_LABEL")
                    .map((f: any) => ({
                        code: f.code || `FEE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        label: f.label || "",
                        amount: String(f.amount ?? 0)
                    }));
            }
            return acc;
        }, {} as Record<string, { code: string; label: string; amount: string }[]>));

        setBaseFeeLabels(transactionTypes.reduce((acc, type) => {
            if (type.category?.toLowerCase() === "civil registry") {
                let arr: any[] = [];
                if (type.defaultFees) {
                    arr = typeof type.defaultFees === "string" ? JSON.parse(type.defaultFees) : type.defaultFees;
                }
                const labelObj = arr.find((f: any) => f.code === "BASE_FEE_LABEL");
                acc[type.id] = labelObj?.label || "Misc Fee";
            }
            return acc;
        }, {} as Record<string, string>));
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

    const handleAddCivilRegistryFee = (typeId: string) => {
        setCivilRegistryDefaultFees(prev => {
            const current = prev[typeId] || [];
            const randomCode = `FEE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            return {
                ...prev,
                [typeId]: [...current, { code: randomCode, label: "", amount: "0" }]
            };
        });
    };

    const handleRemoveCivilRegistryFee = (typeId: string, index: number) => {
        setCivilRegistryDefaultFees(prev => {
            const current = prev[typeId] || [];
            const updated = current.filter((_, idx) => idx !== index);
            return {
                ...prev,
                [typeId]: updated
            };
        });
    };

    const handleCivilRegistryFeeChange = (typeId: string, index: number, field: "label" | "amount", value: string) => {
        setCivilRegistryDefaultFees(prev => {
            const current = prev[typeId] || [];
            const updated = current.map((item, idx) => {
                if (idx === index) {
                    return { ...item, [field]: value };
                }
                return item;
            });
            return {
                ...prev,
                [typeId]: updated
            };
        });
    };

    const handleSaveFees = async () => {
        setIsSavingFees(true);
        try {
            const feesList = Object.entries(fees).map(([id, baseFee]) => {
                const type = transactionTypes.find(t => t.id === id);
                const isCedula = type?.code?.includes("CEDULA");
                const isCivilRegistry = type?.category?.toLowerCase() === "civil registry";

                return {
                    id,
                    baseFee: Number(baseFee) || 0,
                    ...(isCedula ? { studentFee: Number(studentFees[id]) || 0 } : {}),
                    ...(isCivilRegistry ? {
                        defaultFees: [
                            {
                                code: "BASE_FEE_LABEL",
                                label: baseFeeLabels[id] || "Misc Fee",
                                amount: 0
                            },
                            ...(civilRegistryDefaultFees[id] || []).map(f => ({
                                code: f.code,
                                label: f.label,
                                amount: Number(f.amount) || 0
                            }))
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
                                                        {type.category?.toLowerCase() === "civil registry" ? (
                                                            <div className="flex flex-col gap-2 w-full max-w-[320px]">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex-grow max-w-[140px]">
                                                                        <Input 
                                                                            type="text"
                                                                            value={baseFeeLabels[type.id] !== undefined ? baseFeeLabels[type.id] : "Misc Fee"}
                                                                            onChange={(e) => setBaseFeeLabels(prev => ({ ...prev, [type.id]: e.target.value }))}
                                                                            className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-sm w-full"
                                                                            placeholder="Fee Label"
                                                                        />
                                                                    </div>
                                                                    <div className="relative inline-flex items-center max-w-[130px]">
                                                                        <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-black text-sm">₱</span>
                                                                        <Input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={fees[type.id] !== undefined ? fees[type.id] : ""}
                                                                            onChange={(e) => handleFeeChange(type.id, e.target.value)}
                                                                            className="h-9 pl-7 pr-3 text-right rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mt-2 w-full text-left bg-slate-50/50 dark:bg-black/10 border border-slate-100 dark:border-[#2a3040]/80 rounded-xl p-3 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Additional Fees</span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            onClick={() => handleAddCivilRegistryFee(type.id)}
                                                                            className="h-6 px-2 text-[9px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 rounded-md"
                                                                        >
                                                                            <Plus className="w-3 h-3" /> Add
                                                                        </Button>
                                                                    </div>
                                                                    
                                                                    {(civilRegistryDefaultFees[type.id] || []).length === 0 ? (
                                                                        <p className="text-[10px] text-slate-400 italic">No additional fees configured.</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {(civilRegistryDefaultFees[type.id] || []).map((item, idx) => (
                                                                                <div key={item.code} className="flex items-center gap-1.5">
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Fee Label"
                                                                                        value={item.label}
                                                                                        onChange={(e) => handleCivilRegistryFeeChange(type.id, idx, "label", e.target.value)}
                                                                                        className="h-8 px-2 flex-grow rounded-lg bg-white dark:bg-black/30 border-slate-200 dark:border-[#2a3040] text-[10px] font-bold shadow-sm"
                                                                                    />
                                                                                    <div className="relative inline-flex items-center max-w-[80px]">
                                                                                        <span className="absolute left-2 text-slate-400 dark:text-slate-500 font-bold text-[10px]">₱</span>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            value={item.amount}
                                                                                            onChange={(e) => handleCivilRegistryFeeChange(type.id, idx, "amount", e.target.value)}
                                                                                            className="h-8 pl-5 pr-1.5 text-right rounded-lg bg-white dark:bg-black/30 border-slate-200 dark:border-[#2a3040] text-[10px] font-bold shadow-sm w-full"
                                                                                        />
                                                                                    </div>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        onClick={() => handleRemoveCivilRegistryFee(type.id, idx)}
                                                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex items-center justify-center"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                            </>
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
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">E-LGU Municipal Portal • Unified Treasury Services</p>
                <div className="h-0.5 w-12 bg-slate-300 dark:bg-white/10 mx-auto rounded-full" />
            </div>
        </div>
    );
}
