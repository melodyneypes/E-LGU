"use client";

import { Mail, UserCheck, ShieldCheck, Info } from "lucide-react";
import { Resident } from "../../providers/ResidentProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountSetupSectionProps {
    data?: Resident;
}

export function AccountSetupSection({ data }: AccountSetupSectionProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                    <UserCheck className="w-8 h-8 text-blue-600" />
                    Account Setup 
                </h3>
                <p className="text-slate-500 font-medium">Configure the login credentials for this resident.</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner space-y-6">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Email Address <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            name="email" 
                            type="email"
                            defaultValue={data?.email || ""}
                            className="h-12 pl-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="resident@example.com"
                            required
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-1">This will also serve as the login username.</p>
                </div>

                <div className="bg-blue-600/5 border border-blue-600/10 p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-blue-600/10 rounded-xl">
                        <Info className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-700 uppercase tracking-tight">Temporary Password</h4>
                        <p className="text-[11px] text-blue-600/80 font-medium leading-relaxed mt-1">
                            By default, the resident&apos;s <span className="font-bold underline text-blue-800">email address</span> will be used as their temporary password. 
                            The system will require them to set a new password upon their first login.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/30">
                    <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">Account Security</h4>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/60 font-medium"> Residents will receive an OTP (One-Time Password) via their email during their first login to verify their identity and complete the password change process.</p>
                </div>
            </div>
        </div>
    );
}
