"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ForgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/app/auth/actions";
import { z } from "zod";

type FormValues = z.infer<typeof ForgotPasswordSchema>;

interface ForgotPasswordFormProps {
    themeColor?: string;
}

export function ForgotPasswordForm({ themeColor = "#0038a8" }: ForgotPasswordFormProps) {
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [submittedEmail, setSubmittedEmail] = React.useState("");
    const [isEmailFocused, setIsEmailFocused] = React.useState(false);
    const [cooldown, setCooldown] = React.useState(0);

    React.useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const form = useForm<FormValues>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (data: FormValues) => {
        try {
            const result = await requestPasswordReset(data.email);
            if (!result.success && result.error) {
                toast.error(result.error);
                return;
            }
            setSubmittedEmail(data.email);
            setIsSubmitted(true);
            setCooldown(60);
        } catch {
            toast.error("An unexpected error occurred. Please try again.");
        }
    };

    if (isSubmitted) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce"
                        style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}55` }}
                    >
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase">
                            Check your email
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            If <span className="font-bold text-slate-700 dark:text-slate-300">{submittedEmail}</span> is registered, we&apos;ve sent a password reset link. It expires in <span className="font-bold" style={{ color: themeColor }}>15 minutes</span>.
                        </p>
                    </div>
                </div>

                <div
                    className="p-4 rounded-2xl border text-sm space-y-1"
                    style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}
                >
                    <p className="font-bold text-[11px] uppercase tracking-widest" style={{ color: themeColor }}>
                        Didn&apos;t receive the email?
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                        Check your spam folder, or click below to request again.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        type="button"
                        variant="outline"
                        className={`w-full h-12 rounded-2xl font-black uppercase tracking-tighter text-sm border-2 transition-all ${cooldown > 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98]"}`}
                        style={{ borderColor: themeColor, color: themeColor }}
                        disabled={cooldown > 0}
                        onClick={async () => {
                            if (cooldown > 0) return;
                            const toastId = toast.loading("Resending reset link...");
                            try {
                                const result = await requestPasswordReset(submittedEmail);
                                if (!result.success && result.error) {
                                    toast.error(result.error, { id: toastId });
                                    return;
                                }
                                toast.success("Reset link sent successfully!", { id: toastId });
                                setCooldown(60);
                            } catch {
                                toast.error("An unexpected error occurred. Please try again.", { id: toastId });
                            }
                        }}
                    >
                        {cooldown > 0 ? `Send Again (${cooldown}s)` : "Send Again"}
                    </Button>
                    <Link
                        href="/auth/login"
                        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                    Forgot password?
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    No worries! Enter your email and we&apos;ll send you a reset link.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label
                        htmlFor="forgot-email"
                        className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                    >
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail
                            className="absolute left-3 top-4 h-4 w-4 transition-colors duration-200"
                            style={{ color: isEmailFocused ? themeColor : undefined }}
                        />
                        <Input
                            id="forgot-email"
                            type="email"
                            placeholder="name@example.com"
                            className="pl-10 h-12 bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            style={{
                                borderColor: isEmailFocused ? themeColor : undefined,
                                boxShadow: isEmailFocused ? `0 0 0 1px ${themeColor}` : undefined,
                            }}
                            onFocus={() => setIsEmailFocused(true)}
                            {...form.register("email", {
                                onBlur: () => setIsEmailFocused(false),
                            })}
                            disabled={form.formState.isSubmitting}
                        />
                    </div>
                    {form.formState.errors.email && (
                        <p className="text-sm text-red-500 font-medium mt-1">
                            {form.formState.errors.email.message}
                        </p>
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
                            Sending...
                        </>
                    ) : (
                        "Send Reset Link"
                    )}
                </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <Link
                    href="/auth/login"
                    className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
