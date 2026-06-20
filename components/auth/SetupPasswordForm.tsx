"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { finalizePasswordChange } from "@/app/auth/actions";

const setupSchema = z.object({
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[a-z]/, "At least one lowercase letter")
        .regex(/[A-Z]/, "At least one uppercase letter")
        .regex(/[0-9]/, "At least one number")
        .regex(/[^a-zA-Z0-9]/, "At least one symbol"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof setupSchema>;

interface SetupPasswordFormProps {
    email: string;
    token: string;
    themeColor?: string;
}

export function SetupPasswordForm({ email, token, themeColor = "#2563eb" }: SetupPasswordFormProps) {
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = React.useState(false);
    const [isConfirmFocused, setIsConfirmFocused] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(setupSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const passwordValue = form.watch("password") || "";

    const requirements = [
        { label: "At least one lowercase letter", met: /[a-z]/.test(passwordValue) },
        { label: "At least one uppercase letter", met: /[A-Z]/.test(passwordValue) },
        { label: "At least one digit", met: /[0-9]/.test(passwordValue) },
        { label: "At least one special symbol", met: /[^a-zA-Z0-9]/.test(passwordValue) },
    ];

    const onSubmit = async (data: FormValues) => {
        try {
            const result = await finalizePasswordChange(email, token, data.password);
            if (!result.success) {
                toast.error(result.error || "Failed to update password.");
                return;
            }
            setIsSuccess(true);
            toast.success("Account setup complete!");

            // Fetch current session to determine role and auto-set portal cookie
            const response = await fetch("/api/auth/session");
            const session = await response.json();
            
            setTimeout(() => {
                if (session && session.user && session.user.role !== "USER") {
                    document.cookie = `active_portal=admin; path=/; max-age=86400; SameSite=Lax`;
                    window.location.href = "/admin/dashboard";
                } else {
                    window.location.href = "/";
                }
            }, 2000);
        } catch {
            toast.error("An unexpected error occurred. Please try again.");
        }
    };

    if (isSuccess) {
        return (
            <div className="space-y-8 flex flex-col items-center text-center">
                <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce"
                    style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}55` }}
                >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase">
                        Account Setup!
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Your password has been set up successfully. Accessing portal...
                    </p>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeColor }} />
                    <span>Redirecting...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                    Reset Password
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Please choose a strong password to secure your MAPANDAN Municipal account.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* New Password */}
                <div className="space-y-2">
                    <Label
                        htmlFor="setup-password"
                        className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                    >
                        New Password
                    </Label>
                    <div className="relative">
                        <Lock
                            className="absolute left-3 top-4 h-4 w-4 transition-colors duration-200"
                            style={{ color: isPasswordFocused ? themeColor : undefined }}
                        />
                        <Input
                            id="setup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            style={{
                                borderColor: isPasswordFocused ? themeColor : undefined,
                                boxShadow: isPasswordFocused ? `0 0 0 1px ${themeColor}` : undefined,
                            }}
                            onFocus={() => setIsPasswordFocused(true)}
                            {...form.register("password", {
                                onBlur: () => {
                                    setIsPasswordFocused(false);
                                }
                            })}
                            disabled={form.formState.isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-4 opacity-40 hover:opacity-100 focus:outline-none transition-opacity"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {form.formState.errors.password && (
                        <p className="text-sm text-red-500 font-medium">{form.formState.errors.password.message}</p>
                    )}

                    {/* Dynamic Password Requirements checklist */}
                    {requirements.some(req => !req.met) && (
                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-2xl space-y-2.5 shadow-inner transition-all duration-300">
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none">Password Requirements</p>
                            <div className="space-y-2">
                                {requirements.filter(req => !req.met).map((req, i) => (
                                    <div key={i} className="flex items-center gap-3 transition-all duration-300">
                                        <div className="w-4 h-4 rounded-full flex items-center justify-center border border-slate-300 dark:border-white/10 bg-white dark:bg-black/20">
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-white/30 rounded-full" />
                                        </div>
                                        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                            {req.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label
                        htmlFor="setup-confirm-password"
                        className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                    >
                        Confirm Password
                    </Label>
                    <div className="relative">
                        <Lock
                            className="absolute left-3 top-4 h-4 w-4 transition-colors duration-200"
                            style={{ color: isConfirmFocused ? themeColor : undefined }}
                        />
                        <Input
                            id="setup-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            style={{
                                borderColor: isConfirmFocused ? themeColor : undefined,
                                boxShadow: isConfirmFocused ? `0 0 0 1px ${themeColor}` : undefined,
                            }}
                            onFocus={() => setIsConfirmFocused(true)}
                            {...form.register("confirmPassword", {
                                onBlur: () => {
                                    setIsConfirmFocused(false);
                                }
                            })}
                            disabled={form.formState.isSubmitting}
                        />
                    </div>
                    {form.formState.errors.confirmPassword && (
                        <div className="flex items-center gap-1.5 text-[11px] text-destructive font-bold uppercase mt-2 ml-1 leading-none italic">
                            <ShieldAlert className="w-4 h-4" />
                            {form.formState.errors.confirmPassword.message}
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full text-white h-14 rounded-2xl font-black uppercase tracking-tighter italic text-xl shadow-2xl active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2"
                    style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}33` }}
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Updating...
                        </>
                    ) : (
                        "Update Password"
                    )}
                </Button>
            </form>
        </div>
    );
}
