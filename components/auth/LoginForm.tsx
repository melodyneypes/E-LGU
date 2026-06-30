"use client";

import * as React from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Mail, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthTransitionContext } from "@/components/shared/AuthLayout";
import { sendOTP } from "@/app/auth/actions";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LockoutState {
    phase: 1 | 2 | 3;
    attemptsLeft: number;
    cooldownUntil: number | null;
}

const STORAGE_KEY = "emapandan_login_lockout_by_email";
const DEFAULT_STATE: LockoutState = {
    phase: 1,
    attemptsLeft: 3,
    cooldownUntil: null,
};

interface LoginFormProps {
    onSuccess?: () => void;
    themeColor?: string;
    isMaintenanceActive?: boolean;
}

export function LoginForm({ themeColor = "#2563eb", isMaintenanceActive = false }: LoginFormProps) {
    const { triggerLeave } = React.useContext(AuthTransitionContext);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoggingIn, setIsLoggingIn] = React.useState(false);
    const router = useRouter();
    const { data: session, status } = useSession();

    // Auto-logout deactivated accounts and redirect active ones
    React.useEffect(() => {
        if (typeof window === "undefined") return;
        if (isLoggingIn) return;

        const params = new URLSearchParams(window.location.search);
        const hasError = params.has("error");

        if (status === "authenticated" && session && session.user) {
            if (hasError) {
                const errorVal = params.get("error") || "";
                signOut({ callbackUrl: `/auth/login?error=${encodeURIComponent(errorVal)}` });
                return;
            } else {
                // If account is not verified, sign them out
                if ((session.user as any).isEmailVerified === false) {
                    signOut({ callbackUrl: "/auth/login?error=Email not verified" });
                    return;
                }

                // If user needs to change their password, but they loaded the login page directly (or backed out), sign them out to clear everything
                if ((session.user as any).isPasswordChanged === false) {
                    signOut({ redirect: false });
                    return;
                }

                const role = (session.user as any).role;
                const dept = (session.user as any).department ? (session.user as any).department.toUpperCase() : "";
                if (role === "USER") {
                    if (isMaintenanceActive) {
                        signOut({ redirect: false });
                        document.cookie = "bypass_maintenance=true; path=/; max-age=1800";
                        router.push("/");
                    } else {
                        router.push("/");
                    }
                } else if (role === "TREASURY_STAFF" || (role === "ADMIN" && dept === "TREASURY")) {
                    router.push("/admin/treasury?category=CEDULA");
                } else if (role === "ADMIN_AIDE" || (role === "ADMIN" && dept === "BPLO")) {
                    router.push("/admin/bplo");
                } else if (role === "ENGINEER") {
                    router.push("/admin/engineer");
                } else if (dept === "REGISTRAR" || dept === "CIVIL_REGISTRY") {
                    router.push("/admin/registrar");
                } else {
                    router.push("/admin/dashboard");
                }
            }
        }
    }, [session, status, router, isMaintenanceActive, isLoggingIn]);

    // Show toast error if sessionStorage contains account_locked_toast flag
    React.useEffect(() => {
        if (typeof window === "undefined") return;
        if (sessionStorage.getItem("account_locked_toast") === "true") {
            toast.error("Your account has been locked due to 3 rejection strikes. Please visit the Municipal Treasury Office for identity verification and account restoration.");
            sessionStorage.removeItem("account_locked_toast");
        }
    }, []);

    const [lockout, setLockout] = React.useState<LockoutState>(DEFAULT_STATE);
    const [otpLockout, setOtpLockout] = React.useState<LockoutState>(DEFAULT_STATE);
    const [otpSendLockout, setOtpSendLockout] = React.useState<LockoutState>(DEFAULT_STATE);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const emailValue = useWatch({
        control: form.control,
        name: "email",
        defaultValue: "",
    });

    // Load and sync lockout states (both Login and OTP lockout) based on the typed email dynamically
    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const normalizedEmail = emailValue.trim().toLowerCase();
        if (!normalizedEmail) {
            setLockout(DEFAULT_STATE);
            setOtpLockout(DEFAULT_STATE);
            setOtpSendLockout(DEFAULT_STATE);
            return;
        }

        // 1. Sync Login Lockout
        let currentLockout = DEFAULT_STATE;
        const storedLogin = localStorage.getItem(STORAGE_KEY);
        if (storedLogin) {
            try {
                const map = JSON.parse(storedLogin) as { [email: string]: LockoutState };
                const emailLockout = map[normalizedEmail];
                if (emailLockout) {
                    if (emailLockout.cooldownUntil) {
                        const remaining = Math.ceil((emailLockout.cooldownUntil - Date.now()) / 1000);
                        if (remaining > 0) {
                            currentLockout = emailLockout;
                        } else {
                            // Cooldown expired
                            const updated = { ...emailLockout, cooldownUntil: null };
                            const newMap = { ...map, [normalizedEmail]: updated };
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
                            currentLockout = updated;
                        }
                    } else {
                        currentLockout = emailLockout;
                    }
                }
            } catch (e) {
                console.error("Error parsing lockout map:", e);
            }
        }
        setLockout(currentLockout);

        // 2. Sync OTP Lockout
        let currentOtpLockout = DEFAULT_STATE;
        const storedOtp = localStorage.getItem("emapandan_otp_lockout_by_email");
        if (storedOtp) {
            try {
                const map = JSON.parse(storedOtp) as { [email: string]: LockoutState };
                const emailOtpLockout = map[normalizedEmail];
                if (emailOtpLockout) {
                    if (emailOtpLockout.cooldownUntil) {
                        const remaining = Math.ceil((emailOtpLockout.cooldownUntil - Date.now()) / 1000);
                        if (remaining > 0) {
                            currentOtpLockout = emailOtpLockout;
                        } else {
                            // Cooldown expired
                            const updated = { ...emailOtpLockout, cooldownUntil: null };
                            const newMap = { ...map, [normalizedEmail]: updated };
                            localStorage.setItem("emapandan_otp_lockout_by_email", JSON.stringify(newMap));
                            currentOtpLockout = updated;
                        }
                    } else {
                        currentOtpLockout = emailOtpLockout;
                    }
                }
            } catch (e) {
                console.error("Error parsing OTP lockout map:", e);
            }
        }
        setOtpLockout(currentOtpLockout);

        // 3. Sync OTP Send Lockout
        let currentOtpSendLockout = DEFAULT_STATE;
        const storedOtpSend = localStorage.getItem("emapandan_otp_send_lockout_by_email");
        if (storedOtpSend) {
            try {
                const map = JSON.parse(storedOtpSend) as { [email: string]: LockoutState };
                const emailOtpSendLockout = map[normalizedEmail];
                if (emailOtpSendLockout) {
                    if (emailOtpSendLockout.cooldownUntil) {
                        const remaining = Math.ceil((emailOtpSendLockout.cooldownUntil - Date.now()) / 1000);
                        if (remaining > 0) {
                            currentOtpSendLockout = emailOtpSendLockout;
                        } else {
                            // Cooldown expired
                            const updated = { ...emailOtpSendLockout, cooldownUntil: null };
                            const newMap = { ...map, [normalizedEmail]: updated };
                            localStorage.setItem("emapandan_otp_send_lockout_by_email", JSON.stringify(newMap));
                            currentOtpSendLockout = updated;
                        }
                    } else {
                        currentOtpSendLockout = emailOtpSendLockout;
                    }
                }
            } catch (e) {
                console.error("Error parsing OTP send lockout map:", e);
            }
        }
        setOtpSendLockout(currentOtpSendLockout);
    }, [emailValue]);



    const handleFailedAttempt = React.useCallback((email: string) => {
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
                toast.error("Too many failed attempts! Account is locked for 3 minutes.");
            } else if (lockout.phase === 2) {
                nextCooldown = Date.now() + 5 * 60 * 1000; // 5 mins
                nextPhase = 3;
                nextAttempts = 1;
                toast.error("Too many failed attempts! Account is locked for 5 minutes.");
            } else {
                nextCooldown = Date.now() + 10 * 60 * 1000; // 10 mins
                nextPhase = 1;
                nextAttempts = 3;
                toast.error("Too many failed attempts! Account is locked for 10 minutes.");
            }
        } else {
            toast.error(`Invalid credentials. You have ${nextAttempts} attempt${nextAttempts > 1 ? "s" : ""} left.`);
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
    }, [lockout]);

    const handleSuccessAttempt = React.useCallback((email: string) => {
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
    }, []);

    const onSubmit = React.useCallback(async (data: LoginFormValues) => {
        setIsLoggingIn(true);
        const normalizedEmail = data.email.trim().toLowerCase();

        if (lockout.cooldownUntil && Date.now() < lockout.cooldownUntil) {
            const minutesLeft = Math.ceil((lockout.cooldownUntil - Date.now()) / 60000);
            toast.error(`Security lockout is active. Please try again after ${minutesLeft} minute(s).`);
            setIsLoggingIn(false);
            return;
        }

        // Check OTP Lockout directly from localStorage to prevent stale state / autofill bypasses
        const storedOtp = localStorage.getItem("emapandan_otp_lockout_by_email");
        if (storedOtp) {
            try {
                const map = JSON.parse(storedOtp) as { [email: string]: LockoutState };
                const emailOtpLockout = map[normalizedEmail];
                if (emailOtpLockout && emailOtpLockout.cooldownUntil) {
                    const remaining = emailOtpLockout.cooldownUntil - Date.now();
                    if (remaining > 0) {
                        const minutesLeft = Math.ceil(remaining / 60000);
                        toast.error(`Too many failed attempts! OTP verification is locked for ${minutesLeft} minute(s).`);
                        setIsLoggingIn(false);
                        return;
                    }
                }
            } catch (e) {
                console.error("Error parsing OTP lockout map:", e);
            }
        }

        if (otpSendLockout.cooldownUntil && Date.now() < otpSendLockout.cooldownUntil) {
            const minutesLeft = Math.ceil((otpSendLockout.cooldownUntil - Date.now()) / 60000);
            toast.error(`Cooldown is active. Please wait ${minutesLeft} minute(s) before trying again.`);
            setIsLoggingIn(false);
            return;
        }

        try {
            if (typeof window !== "undefined") {
                sessionStorage.setItem("logging_in_otp", "true");
            }

            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                if (typeof window !== "undefined") {
                    sessionStorage.removeItem("logging_in_otp");
                }
                const errorMessage = result.error.toLowerCase();
                if (
                    errorMessage.includes("approved") ||
                    errorMessage.includes("deactivated") ||
                    errorMessage.includes("rejected") ||
                    errorMessage.includes("cooldown") ||
                    errorMessage.includes("attempts") ||
                    errorMessage.includes("deceased") ||
                    errorMessage.includes("dead")
                ) {
                    toast.error(errorMessage);
                    
                    // Sync server-side password rate limits to local storage to prevent bypasses
                    if (errorMessage.includes("Too many failed login attempts")) {
                        const match = errorMessage.match(/in (\d+) minute/);
                        const minutes = match ? parseInt(match[1], 10) : 15; // default to 15 mins
                        
                        const stored = localStorage.getItem(STORAGE_KEY);
                        let map: { [email: string]: LockoutState } = {};
                        if (stored) {
                            try {
                                map = JSON.parse(stored) || {};
                            } catch {}
                        }
                        const existing = map[normalizedEmail] || DEFAULT_STATE;
                        const newState: LockoutState = {
                            ...existing,
                            cooldownUntil: Date.now() + minutes * 60 * 1000,
                        };
                        map[normalizedEmail] = newState;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
                    }
                    
                    setIsLoggingIn(false);
                    return;
                }

                handleFailedAttempt(normalizedEmail);
                setIsLoggingIn(false);
                return;
            }

            // Fetch the session to get user info
            const response = await fetch("/api/auth/session");
            const session = await response.json();

            if (session && session.user) {
                handleSuccessAttempt(normalizedEmail);
                const { role, isPasswordChanged, isEmailVerified } = session.user;

                if (isEmailVerified === false) {
                    if (typeof window !== "undefined") {
                        sessionStorage.removeItem("logging_in_otp");
                    }
                    await signOut({ redirect: false });
                    toast.error("Your email address is not verified yet. Please contact an administrator to verify your account.");
                    setIsLoggingIn(false);
                    return;
                }

                if (isMaintenanceActive && role === "USER") {
                    if (typeof window !== "undefined") {
                        sessionStorage.removeItem("logging_in_otp");
                    }
                    await signOut({ redirect: false });
                    document.cookie = "bypass_maintenance=true; path=/; max-age=1800";
                    toast.error("The portal is currently under maintenance. Citizens are not allowed to sign in at this time.");
                    router.push("/");
                    setIsLoggingIn(false);
                    return;
                }

                // Check if user needs to change password
                if (isPasswordChanged === false) {
                    if (typeof window !== "undefined") {
                        sessionStorage.setItem("logging_in_otp", "true");
                    }
                    
                    // Check if we already have a valid OTP sent to this email that hasn't expired yet
                    let hasActiveOTP = false;
                    if (typeof window !== "undefined") {
                        const storedEmail = sessionStorage.getItem("setup_email");
                        const storedExpiry = sessionStorage.getItem("setup_timer_expiry");
                        if (storedEmail && storedEmail.trim().toLowerCase() === normalizedEmail && storedExpiry) {
                            const remaining = Math.ceil((parseInt(storedExpiry, 10) - Date.now()) / 1000);
                            if (remaining > 0) {
                                hasActiveOTP = true;
                            }
                        }
                    }

                    if (hasActiveOTP) {
                        // Skip sending new OTP since they already have one active
                        if (typeof window !== "undefined") {
                            sessionStorage.setItem("otp_already_sent_warning", "true");
                        }
                        
                        const performRedirect = () => {
                            window.location.href = "/auth/verify-otp";
                        };

                        if (triggerLeave) {
                            triggerLeave(performRedirect);
                        } else {
                            performRedirect();
                        }
                        return;
                    }

                    // Try to send OTP first to verify if rate limits allow it
                    const otpResult = await sendOTP(normalizedEmail);
                    if (!otpResult.success) {
                        if (typeof window !== "undefined") {
                            sessionStorage.removeItem("logging_in_otp");
                        }

                        if (otpResult.code === "otp_lockout") {
                            const minutesLeft = (otpResult as any).minutesLeft || 3;
                            const stored = localStorage.getItem("emapandan_otp_lockout_by_email");
                            let map: { [email: string]: LockoutState } = {};
                            if (stored) {
                                try {
                                    map = JSON.parse(stored) || {};
                                } catch {}
                            }
                            const existing = map[normalizedEmail] || DEFAULT_STATE;
                            const newState: LockoutState = {
                                ...existing,
                                cooldownUntil: Date.now() + minutesLeft * 60 * 1000,
                            };
                            map[normalizedEmail] = newState;
                            localStorage.setItem("emapandan_otp_lockout_by_email", JSON.stringify(map));

                            toast.error(otpResult.error || `Too many failed attempts! OTP verification is locked for ${minutesLeft} minute(s).`);
                            await signOut({ redirect: false });
                            setIsLoggingIn(false);
                            return;
                        }

                        const otpErrorLower = otpResult.error?.toLowerCase() || "";
                        const isSupabaseRateLimit = 
                            (otpResult as any).code === "over_email_send_rate_limit" || 
                            (otpResult.error && (
                                otpErrorLower.includes("security purposes") || 
                                otpErrorLower.includes("rate limit")
                            ));

                        if (isSupabaseRateLimit) {
                            // Extract seconds from error string if possible, default to 120s
                            const match = otpResult.error.match(/after (\d+) second/i);
                            const seconds = match ? parseInt(match[1], 10) : 120;
                            const minutes = Math.ceil(seconds / 60);

                            // Store OTP lockout in client localStorage to temporarily block login attempts
                            const stored = localStorage.getItem("emapandan_otp_send_lockout_by_email");
                            let map: { [email: string]: LockoutState } = {};
                            if (stored) {
                                try {
                                    map = JSON.parse(stored) || {};
                                } catch {}
                            }
                            const existing = map[normalizedEmail] || DEFAULT_STATE;
                            const newState: LockoutState = {
                                ...existing,
                                cooldownUntil: Date.now() + minutes * 60 * 1000,
                            };
                            map[normalizedEmail] = newState;
                            localStorage.setItem("emapandan_otp_send_lockout_by_email", JSON.stringify(map));

                            // Redirect anyway with warning so they can enter the code already in their email
                            if (typeof window !== "undefined") {
                                sessionStorage.setItem("otp_already_sent_warning", "true");
                                sessionStorage.setItem("setup_email", normalizedEmail);
                                sessionStorage.setItem("setup_timer_expiry", (Date.now() + seconds * 1000).toString());
                            }

                            const performRedirect = () => {
                                window.location.href = "/auth/verify-otp";
                            };

                            if (triggerLeave) {
                                triggerLeave(performRedirect);
                            } else {
                                performRedirect();
                            }
                            return;
                        } else {
                            toast.error(otpResult.error || "Failed to send verification code.");

                            // Parse rate limit cooldown if exists and store it in client localStorage
                            if (otpResult.error && otpResult.error.toLowerCase().includes("too many otp requests")) {
                                const match = otpResult.error.match(/after (\d+) minute/i);
                                const minutes = match ? parseInt(match[1], 10) : 45;
                                
                                const stored = localStorage.getItem("emapandan_otp_send_lockout_by_email");
                                let map: { [email: string]: LockoutState } = {};
                                if (stored) {
                                    try {
                                        map = JSON.parse(stored) || {};
                                    } catch {}
                                }
                                const existing = map[normalizedEmail] || DEFAULT_STATE;
                                const newState: LockoutState = {
                                    ...existing,
                                    cooldownUntil: Date.now() + minutes * 60 * 1000,
                                };
                                map[normalizedEmail] = newState;
                                localStorage.setItem("emapandan_otp_send_lockout_by_email", JSON.stringify(map));
                            }
                        }
                        
                        // Sign out the session so they stay on login page
                        await signOut({ redirect: false });
                        setIsLoggingIn(false);
                        return;
                    }
                    
                    // Persist state in sessionStorage so verify-otp doesn't double-send on mount
                    const remaining = (otpResult as any).alreadySent 
                        ? (otpResult as any).remainingSeconds 
                        : 120;

                    if (typeof window !== "undefined") {
                        sessionStorage.setItem("setup_email", normalizedEmail);
                        sessionStorage.setItem("setup_timer_expiry", (Date.now() + remaining * 1000).toString());
                        if ((otpResult as any).alreadySent) {
                            sessionStorage.setItem("otp_already_sent_warning", "true");
                        }
                    }
                    
                    window.location.href = "/auth/verify-otp";
                    return;
                }

                // Normal redirect based on role
                const performRedirect = () => {
                    if (typeof window !== "undefined") {
                        sessionStorage.removeItem("logging_in_otp");
                    }
                    if (role === "USER") {
                        router.push("/");
                        toast.success("Logged in successfully");
                    } else {
                        // Auto-set admin portal cookie so page.tsx won't redirect to landing
                        document.cookie = `active_portal=admin; path=/; max-age=86400; SameSite=Lax`;
                        toast.success("Logged in successfully");
                        
                        const pages = session.user?.accessiblePages;
                        if (pages && pages.length > 0) {
                            router.push(pages[0]);
                        } else {
                            const dept = session.user?.department;
                            if (dept && (dept.toUpperCase() === "REGISTRAR" || dept.toUpperCase() === "CIVIL_REGISTRY")) {
                                router.push("/admin/registrar");
                            } else {
                                router.push("/admin/dashboard");
                            }
                        }
                    }
                };



                if (triggerLeave) {
                    triggerLeave(performRedirect);
                } else {
                    performRedirect();
                }
            } else {
                if (typeof window !== "undefined") {
                    sessionStorage.removeItem("logging_in_otp");
                }
                if (triggerLeave) {
                    triggerLeave(() => router.push("/"));
                } else {
                    router.push("/");
                }
            }
        } catch (error) {
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("logging_in_otp");
            }
            toast.error("An unexpected error occurred");
            console.error("Login error:", error);
            setIsLoggingIn(false);
        }
    }, [lockout, otpSendLockout, handleFailedAttempt, handleSuccessAttempt, router, triggerLeave, isMaintenanceActive]);



    const [isEmailFocused, setIsEmailFocused] = React.useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = React.useState(false);

    const isLocked = !!lockout.cooldownUntil;
    const isOtpLocked = !!otpLockout.cooldownUntil;
    const isOtpSendLocked = !!otpSendLockout.cooldownUntil;

    return (
        <>
            <div className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">Welcome back</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Please enter your details to access your account.
                    </p>
                </div>

                {!isLocked && !isOtpLocked && !isOtpSendLocked && lockout.attemptsLeft < (lockout.phase === 1 ? 3 : lockout.phase === 2 ? 2 : 1) && (
                    <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 text-left">
                            <h4 className="text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">Warning: Remaining Attempts</h4>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-normal mt-1">
                                You have <span className="font-extrabold text-amber-600 dark:text-amber-400">{lockout.attemptsLeft} attempt{lockout.attemptsLeft > 1 ? "s" : ""} remaining</span> before account lockout.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2 text-left">
                        <Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Email Address</Label>
                        <div className="relative">
                            <Mail
                                className="absolute left-3 top-4 h-4 w-4 transition-colors duration-200"
                                style={{ color: isEmailFocused ? themeColor : undefined }}
                            />
                            <Input
                                id="login-email"
                                type="email"
                                placeholder="name@example.com"
                                className="pl-10 h-12 bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{
                                    borderColor: isEmailFocused ? themeColor : undefined,
                                    boxShadow: isEmailFocused ? `0 0 0 1px ${themeColor}` : undefined
                                }}
                                onFocus={() => setIsEmailFocused(true)}
                                {...form.register("email", {
                                    onBlur: () => setIsEmailFocused(false)
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

                    <div className="space-y-2 text-left">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Password</Label>
                            <Link
                                href="/auth/forgot-password"
                                className="text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-colors"
                                style={{ color: themeColor }}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock
                                className="absolute left-3 top-4 h-4 w-4 transition-colors duration-200"
                                style={{ color: isPasswordFocused ? themeColor : undefined }}
                            />
                            <Input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-12 bg-white dark:bg-black/20 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{
                                    borderColor: isPasswordFocused ? themeColor : undefined,
                                    boxShadow: isPasswordFocused ? `0 0 0 1px ${themeColor}` : undefined
                                }}
                                onFocus={() => setIsPasswordFocused(true)}
                                {...form.register("password", {
                                    onBlur: () => setIsPasswordFocused(false)
                                })}
                                disabled={form.formState.isSubmitting}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-4 opacity-40 hover:opacity-100 focus:outline-none transition-colors"
                                style={{ color: isPasswordFocused || showPassword ? themeColor : undefined, opacity: isPasswordFocused || showPassword ? 1 : undefined }}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-sm text-red-500 font-medium mt-1">
                                {form.formState.errors.password.message}
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
                            "Authenticating..."
                        ) : (
                            "Sign in"
                        )}
                    </Button>
                </form>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-colors group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to landing page
                    </Link>
                </div>
            </div>

        </>
    );
}
