"use client";

import * as React from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Mail, Lock, ShieldAlert, Timer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthTransitionContext } from "@/components/shared/AuthLayout";
import { checkEmailExists, sendOTP } from "@/app/auth/actions";

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

        if (status === "authenticated" && session) {
            if (hasError) {
                signOut({ redirect: false });
            } else {
                // If user needs to change their password, redirect them to the verify-otp page
                if ((session.user as any).isPasswordChanged === false) {
                    router.push("/auth/verify-otp");
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

    const [lockout, setLockout] = React.useState<LockoutState>(DEFAULT_STATE);
    const [timeLeft, setTimeLeft] = React.useState<number>(0); // remaining seconds
    const [otpLockout, setOtpLockout] = React.useState<LockoutState>(DEFAULT_STATE);
    const [otpTimeLeft, setOtpTimeLeft] = React.useState<number>(0); // remaining OTP lockout seconds

    const hasToastedRef = React.useRef<{ [key: string]: boolean }>({});

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
            setTimeLeft(0);
            setOtpLockout(DEFAULT_STATE);
            setOtpTimeLeft(0);
            return;
        }

        // 1. Sync Login Lockout
        let currentLockout = DEFAULT_STATE;
        let loginRemaining = 0;
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
                            loginRemaining = remaining;
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
        setTimeLeft(loginRemaining);

        // 2. Sync OTP Lockout
        let currentOtpLockout = DEFAULT_STATE;
        let otpRemaining = 0;
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
                            otpRemaining = remaining;
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
        setOtpTimeLeft(otpRemaining);
    }, [emailValue]);

    // Timer countdown for active login lockout of the current email
    React.useEffect(() => {
        if (!lockout.cooldownUntil) {
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.ceil((lockout.cooldownUntil! - Date.now()) / 1000);
            const normalizedEmail = emailValue.trim().toLowerCase();

            if (remaining <= 0) {
                // Cooldown complete
                const updated = {
                    ...lockout,
                    cooldownUntil: null,
                };
                setLockout(updated);
                setTimeLeft(0);
                
                const toastKey = `login-complete-${normalizedEmail}-${lockout.cooldownUntil}`;
                if (!hasToastedRef.current[toastKey]) {
                    hasToastedRef.current[toastKey] = true;
                    toast.success("Cooldown complete. You can now try to sign in again!");
                }

                // Update in localStorage map
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
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lockout.cooldownUntil, lockout, emailValue]);

    // Timer countdown for active OTP lockout
    React.useEffect(() => {
        if (!otpLockout.cooldownUntil) {
            setOtpTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.ceil((otpLockout.cooldownUntil! - Date.now()) / 1000);
            const normalizedEmail = emailValue.trim().toLowerCase();

            if (remaining <= 0) {
                // Cooldown complete
                const updated = {
                    ...otpLockout,
                    cooldownUntil: null,
                };
                setOtpLockout(updated);
                setOtpTimeLeft(0);
                
                const toastKey = `otp-complete-${normalizedEmail}-${otpLockout.cooldownUntil}`;
                if (!hasToastedRef.current[toastKey]) {
                    hasToastedRef.current[toastKey] = true;
                    toast.success("OTP Cooldown complete. You can now try to sign in again!");
                }

                // Update in localStorage map
                if (normalizedEmail) {
                    const stored = localStorage.getItem("emapandan_otp_lockout_by_email");
                    let map: { [email: string]: LockoutState } = {};
                    if (stored) {
                        try {
                            map = JSON.parse(stored) || {};
                        } catch { }
                    }
                    map[normalizedEmail] = updated;
                    localStorage.setItem("emapandan_otp_lockout_by_email", JSON.stringify(map));
                }

                clearInterval(interval);
            } else {
                setOtpTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [otpLockout.cooldownUntil, otpLockout, emailValue]);

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
            toast.error("Security cooldown active. Please wait.");
            setIsLoggingIn(false);
            return;
        }

        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                const errorMessage = result.error;
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
                        setTimeLeft(minutes * 60);
                    }
                    
                    setIsLoggingIn(false);
                    return;
                }

                const emailCheck = await checkEmailExists(normalizedEmail);
                if (emailCheck.success && emailCheck.exists) {
                    handleFailedAttempt(normalizedEmail);
                } else {
                    toast.error("Email does not exist.");
                }
                setIsLoggingIn(false);
                return;
            }

            // Fetch the session to get user info
            const response = await fetch("/api/auth/session");
            const session = await response.json();

            if (session && session.user) {
                handleSuccessAttempt(normalizedEmail);
                const { role, isPasswordChanged } = session.user;

                if (isMaintenanceActive && role === "USER") {
                    await signOut({ redirect: false });
                    document.cookie = "bypass_maintenance=true; path=/; max-age=1800";
                    toast.error("The portal is currently under maintenance. Citizens are not allowed to sign in at this time.");
                    router.push("/");
                    setIsLoggingIn(false);
                    return;
                }

                // Check if user needs to change password
                if (isPasswordChanged === false) {
                    // Try to send OTP first to verify if rate limits allow it
                    const otpResult = await sendOTP(normalizedEmail);
                    if (!otpResult.success) {
                        toast.error(otpResult.error || "Failed to send verification code.");
                        
                        // Parse rate limit cooldown if exists and store it in client localStorage
                        if (otpResult.error && otpResult.error.includes("Too many OTP requests")) {
                            const match = otpResult.error.match(/after (\d+) minute/);
                            const minutes = match ? parseInt(match[1], 10) : 45;
                            
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
                                cooldownUntil: Date.now() + minutes * 60 * 1000,
                            };
                            map[normalizedEmail] = newState;
                            localStorage.setItem("emapandan_otp_lockout_by_email", JSON.stringify(map));
                            setOtpTimeLeft(minutes * 60);
                        }
                        
                        // Sign out the session so they stay on login page
                        await signOut({ redirect: false });
                        setIsLoggingIn(false);
                        return;
                    }
                    
                    // Persist state in sessionStorage so verify-otp doesn't double-send on mount
                    sessionStorage.setItem("setup_email", normalizedEmail);
                    sessionStorage.setItem("setup_timer_expiry", (Date.now() + 120 * 1000).toString());
                    
                    router.push("/auth/verify-otp");
                    return;
                }

                // Normal redirect based on role
                const performRedirect = () => {
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
                if (triggerLeave) {
                    triggerLeave(() => router.push("/"));
                } else {
                    router.push("/");
                }
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
            console.error("Login error:", error);
            setIsLoggingIn(false);
        }
    }, [lockout, handleFailedAttempt, handleSuccessAttempt, router, triggerLeave, isMaintenanceActive]);



    const [isEmailFocused, setIsEmailFocused] = React.useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = React.useState(false);

    return (
        <>
            <div className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">Welcome back</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Please enter your details to access your account.
                    </p>
                </div>

                {timeLeft > 0 && (
                    <div className="p-4 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-pulse">
                        <div className="p-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                            <ShieldAlert className="h-5 w-5 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400 leading-none">Security Lockout Active</h4>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-normal mt-1">
                                Too many failed attempts. To prevent spam, please wait <span className="font-extrabold text-red-600 dark:text-red-400">{Math.floor(timeLeft / 60)}m {timeLeft % 60}s</span> before trying again.
                            </p>
                        </div>
                    </div>
                )}

                {otpTimeLeft > 0 && (
                    <div className="p-4 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-pulse">
                        <div className="p-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                            <ShieldAlert className="h-5 w-5 animate-bounce" />
                        </div>
                        <div className="space-y-1 flex-1 text-left">
                            <h4 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400 leading-none">OTP Lockout Active</h4>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-normal mt-1">
                                Too many failed OTP attempts. To prevent spam, please wait <span className="font-extrabold text-red-600 dark:text-red-400">{Math.floor(otpTimeLeft / 60)}m {otpTimeLeft % 60}s</span> before trying again.
                            </p>
                        </div>
                    </div>
                )}

                {timeLeft === 0 && otpTimeLeft === 0 && lockout.attemptsLeft < (lockout.phase === 1 ? 3 : lockout.phase === 2 ? 2 : 1) && (
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
                                disabled={timeLeft > 0 || otpTimeLeft > 0 || form.formState.isSubmitting}
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
                                disabled={timeLeft > 0 || otpTimeLeft > 0 || form.formState.isSubmitting}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-4 opacity-40 hover:opacity-100 focus:outline-none transition-colors"
                                style={{ color: isPasswordFocused || showPassword ? themeColor : undefined, opacity: isPasswordFocused || showPassword ? 1 : undefined }}
                                disabled={timeLeft > 0 || otpTimeLeft > 0}
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
                        disabled={timeLeft > 0 || otpTimeLeft > 0 || form.formState.isSubmitting}
                    >
                        {timeLeft > 0 || otpTimeLeft > 0 ? (
                            <>
                                <Timer className="h-5 w-5 animate-spin" />
                                Locked ({Math.floor(Math.max(timeLeft, otpTimeLeft) / 60)}m {Math.max(timeLeft, otpTimeLeft) % 60}s)
                            </>
                        ) : form.formState.isSubmitting ? (
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
