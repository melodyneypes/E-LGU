"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendOTP, verifyOTPOnly } from "@/app/auth/actions";
import { signOut } from "next-auth/react";

const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type FormValues = z.infer<typeof otpSchema>;

interface LockoutState {
    phase: 1 | 2 | 3;
    attemptsLeft: number;
    cooldownUntil: number | null;
}

const STORAGE_KEY = "emapandan_otp_lockout_by_email";
const DEFAULT_STATE: LockoutState = {
    phase: 1,
    attemptsLeft: 3,
    cooldownUntil: null,
};

interface VerifyOTPFormProps {
    email: string;
    themeColor?: string;
}

export function VerifyOTPForm({ email, themeColor = "#2563eb" }: VerifyOTPFormProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [timeLeft, setTimeLeft] = React.useState(120);
    const [isOtpFocused, setIsOtpFocused] = React.useState(false);
    const [lockout, setLockout] = React.useState<LockoutState>(DEFAULT_STATE);
    const [lockoutTimeLeft, setLockoutTimeLeft] = React.useState<number>(0);
    const hasSentRef = React.useRef(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    // Load and sync lockout state based on the email dynamically
    React.useEffect(() => {
        if (typeof window === "undefined" || !email) return;

        const normalizedEmail = email.trim().toLowerCase();
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const map = JSON.parse(stored) as { [email: string]: LockoutState };
                const emailLockout = map[normalizedEmail];
                if (emailLockout) {
                    if (emailLockout.cooldownUntil) {
                        const remaining = Math.ceil((emailLockout.cooldownUntil - Date.now()) / 1000);
                        if (remaining > 0) {
                            setLockout(emailLockout);
                            setLockoutTimeLeft(remaining);
                            
                            // Reset setup session storage state
                            sessionStorage.removeItem("setup_email");
                            sessionStorage.removeItem("setup_timer_expiry");
                            
                            // Sign out to prevent auth redirect loop back to verify-otp
                            (async () => {
                                await signOut({ redirect: false });
                                setTimeout(() => {
                                    window.location.href = "/auth/login";
                                }, 1000);
                            })();
                            return;
                        } else {
                            // Cooldown expired
                            const updated = { ...emailLockout, cooldownUntil: null };
                            const newMap = { ...map, [normalizedEmail]: updated };
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
                            setLockout(updated);
                            setLockoutTimeLeft(0);
                            return;
                        }
                    }
                    setLockout(emailLockout);
                    setLockoutTimeLeft(0);
                    return;
                }
            } catch (e) {
                console.error("Error parsing OTP lockout map:", e);
            }
        }
        setLockout(DEFAULT_STATE);
        setLockoutTimeLeft(0);
    }, [email]);

    // Timer countdown for active lockout of the current email
    React.useEffect(() => {
        if (!lockout.cooldownUntil) {
            setLockoutTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.ceil((lockout.cooldownUntil! - Date.now()) / 1000);
            if (remaining <= 0) {
                // Cooldown complete
                const updated = {
                    ...lockout,
                    cooldownUntil: null,
                };
                setLockout(updated);
                setLockoutTimeLeft(0);
                toast.success("Cooldown complete. You can now try to verify your OTP again!");

                // Update in localStorage map
                const normalizedEmail = email.trim().toLowerCase();
                if (normalizedEmail) {
                    const stored = localStorage.getItem(STORAGE_KEY);
                    let map: { [email: string]: LockoutState } = {};
                    if (stored) {
                        try {
                            map = JSON.parse(stored) || {};
                        } catch { }
                    }
                    map[normalizedEmail] = updated;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
                }

                clearInterval(interval);
            } else {
                setLockoutTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lockout.cooldownUntil, lockout, email]);

    const handleFailedAttempt = React.useCallback(async () => {
        if (!email) return;
        const normalizedEmail = email.trim().toLowerCase();

        let nextPhase = lockout.phase;
        let nextAttempts = lockout.attemptsLeft - 1;
        let nextCooldown: number | null = null;

        if (nextAttempts <= 0) {
            // Cooldown trigger and phase advancement
            if (lockout.phase === 1) {
                nextCooldown = Date.now() + 3 * 60 * 1000; // 3 mins
                nextPhase = 2;
                nextAttempts = 2;
                toast.error("Too many failed attempts! OTP verification is locked for 3 minutes.");
            } else if (lockout.phase === 2) {
                nextCooldown = Date.now() + 5 * 60 * 1000; // 5 mins
                nextPhase = 3;
                nextAttempts = 1;
                toast.error("Too many failed attempts! OTP verification is locked for 5 minutes.");
            } else {
                nextCooldown = Date.now() + 10 * 60 * 1000; // 10 mins
                nextPhase = 1;
                nextAttempts = 3;
                toast.error("Too many failed attempts! OTP verification is locked for 10 minutes.");
            }

            // Reset setup session storage state
            sessionStorage.removeItem("setup_email");
            sessionStorage.removeItem("setup_timer_expiry");

            // Sign out to prevent auth redirect loop back to verify-otp
            await signOut({ redirect: false });

            // Redirect back to login page
            setTimeout(() => {
                window.location.href = "/auth/login";
            }, 1000);
        } else {
            toast.error(`Invalid OTP. You have ${nextAttempts} attempt${nextAttempts > 1 ? "s" : ""} left.`);
        }

        const newState: LockoutState = {
            phase: nextPhase,
            attemptsLeft: nextAttempts,
            cooldownUntil: nextCooldown,
        };

        setLockout(newState);

        // Save to global map in localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        let map: { [email: string]: LockoutState } = {};
        if (stored) {
            try {
                map = JSON.parse(stored) || {};
            } catch { }
        }
        map[normalizedEmail] = newState;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }, [lockout, email]);

    const handleSuccessAttempt = React.useCallback(() => {
        if (!email) return;
        const normalizedEmail = email.trim().toLowerCase();

        setLockout(DEFAULT_STATE);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const map = JSON.parse(stored) || {};
                delete map[normalizedEmail];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
            } catch { }
        }
    }, [email]);

    const handleSendOTP = React.useCallback(async (isResend: boolean = false) => {
        setIsLoading(true);
        try {
            const result = await sendOTP(email);
            if (result.success) {
                toast.success(isResend ? "Code resent successfully" : "Verification code sent to your email");
                setTimeLeft(120);
                
                // Persist state in sessionStorage
                sessionStorage.setItem("setup_email", email);
                sessionStorage.setItem("setup_timer_expiry", (Date.now() + 120 * 1000).toString());
            } else {
                toast.error(result.error || "Failed to send code.");
                
                if (result.error && result.error.includes("Too many OTP requests")) {
                    // Extract minutes remaining from error string: "Too many OTP requests. Please try again after 47 minute(s)."
                    const match = result.error.match(/after (\d+) minute/);
                    const minutes = match ? parseInt(match[1], 10) : 45; // Default fallback to 45 mins
                    
                    const normalizedEmail = email.trim().toLowerCase();
                    const stored = localStorage.getItem(STORAGE_KEY);
                    let map: { [email: string]: LockoutState } = {};
                    if (stored) {
                        try {
                            map = JSON.parse(stored) || {};
                        } catch { }
                    }
                    
                    const existing = map[normalizedEmail] || DEFAULT_STATE;
                    const newState: LockoutState = {
                        ...existing,
                        cooldownUntil: Date.now() + minutes * 60 * 1000,
                    };
                    map[normalizedEmail] = newState;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
                    
                    // Clear sessionStorage
                    sessionStorage.removeItem("setup_email");
                    sessionStorage.removeItem("setup_timer_expiry");
                    
                    // Sign out to prevent auth redirect loop back to verify-otp
                    await signOut({ redirect: false });
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = "/auth/login";
                    }, 1000);
                }
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    }, [email]);

    // Timer logic
    React.useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            toast.error("Verification code expired. Please request a new one.");
            sessionStorage.removeItem("setup_timer_expiry");
            sessionStorage.removeItem("setup_email");
        }
    }, [timeLeft]);

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return {
            mins: mins.toString().padStart(2, '0'),
            secs: secs.toString().padStart(2, '0')
        };
    };

    // Auto-send OTP when the page mounts (with React 18 Strict Mode Guard)
    React.useEffect(() => {
        if (hasSentRef.current) return;

        const storedEmail = sessionStorage.getItem("setup_email");
        const storedExpiry = sessionStorage.getItem("setup_timer_expiry");

        if (storedEmail === email && storedExpiry) {
            const remaining = Math.ceil((parseInt(storedExpiry, 10) - Date.now()) / 1000);
            if (remaining > 0) {
                setTimeLeft(remaining);
                hasSentRef.current = true;
                return;
            }
        }

        // Send OTP if no active timer is stored
        hasSentRef.current = true;
        handleSendOTP(false);
    }, [email, handleSendOTP]);



    const onSubmit = async (data: FormValues) => {
        if (lockout.cooldownUntil && Date.now() < lockout.cooldownUntil) {
            toast.error("Security cooldown active. Redirecting to login page...");
            setTimeout(() => {
                window.location.href = `/auth/login?otp_locked=true&email=${encodeURIComponent(email)}`;
            }, 1500);
            return;
        }

        setIsLoading(true);
        try {
            const result = await verifyOTPOnly(email, data.otp);
            if (result.success && result.token) {
                handleSuccessAttempt();
                // Clear sessionStorage active state since verification is done
                sessionStorage.removeItem("setup_timer_expiry");
                sessionStorage.removeItem("setup_email");
                
                // Redirect user to the new setup page
                window.location.href = `/auth/setup-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(result.token)}`;
            } else {
                handleFailedAttempt();
                form.setError("otp", { message: result.error || "Invalid OTP" });
            }
        } catch {
            toast.error("An error occurred during verification");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                    Verify Identity
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    We&apos;ve sent a 6-digit code to <span className="font-bold text-slate-900 dark:text-white break-all">{email}</span>. Please enter it below.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="relative">
                    <Input
                        placeholder="000 000"
                        maxLength={6}
                        className="h-14 w-full text-center text-xl sm:text-3xl font-bold tracking-[0.2em] sm:tracking-[0.4em] rounded-xl bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 shadow-inner text-slate-900 dark:text-white focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-background transition-all"
                        style={{
                            borderColor: isOtpFocused ? themeColor : undefined,
                            boxShadow: isOtpFocused ? `0 0 0 1px ${themeColor}` : undefined
                        }}
                        onFocus={() => setIsOtpFocused(true)}
                        {...form.register("otp", {
                            onBlur: () => setIsOtpFocused(false)
                        })}
                        disabled={isLoading}
                    />
                    {form.formState.errors.otp && (
                        <p className="text-sm text-red-500 font-medium mt-1 text-center">{form.formState.errors.otp.message}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white h-14 rounded-2xl font-black uppercase tracking-tighter italic text-lg sm:text-xl shadow-2xl active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2"
                    style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}33` }}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <span className="flex items-center gap-2 text-sm sm:text-base">
                            Verify and Setup Password <ArrowRight className="w-4 h-4" />
                        </span>
                    )}
                </Button>

                <div className="flex flex-col items-center gap-6 pt-2">
                    <div className="flex gap-4">
                        <div className="text-center group">
                            <div className="bg-slate-100 dark:bg-slate-900/50 w-14 sm:w-16 h-10 sm:h-12 rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors shadow-sm" style={{ color: themeColor }}>
                                {formatTimer(timeLeft).mins}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Minutes</span>
                        </div>
                        <span className="font-bold text-2xl sm:text-3xl self-start mt-1 sm:mt-1.5" style={{ color: themeColor }}>:</span>
                        <div className="text-center group">
                            <div className="bg-slate-100 dark:bg-slate-900/50 w-14 sm:w-16 h-10 sm:h-12 rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors shadow-sm" style={{ color: themeColor }}>
                                {formatTimer(timeLeft).secs}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Seconds</span>
                        </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-400 text-center">
                        Didn&apos;t receive code?{" "}
                        <button
                            type="button"
                            onClick={() => handleSendOTP(true)}
                            disabled={isLoading || timeLeft > 60 || lockoutTimeLeft > 0}
                            className="font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            style={{ color: themeColor }}
                        >
                            Resend code {timeLeft > 60 && `(${timeLeft - 60}s)`}
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}
