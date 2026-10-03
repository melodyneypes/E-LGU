"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, ShieldCheck, LogOut, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface PortalSelectFormProps {
    themeColor?: string;
}

export function PortalSelectForm({ themeColor = "#0038a8" }: PortalSelectFormProps) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loadingPortal, setLoadingPortal] = React.useState<"citizen" | "admin" | "logout" | null>(null);

    React.useEffect(() => {
        // Guard: If session is fully loaded and user role is USER, redirect to home immediately
        if (status === "authenticated" && session?.user && (session.user as any).role === "USER") {
            router.push("/");
        }
    }, [session, status, router]);

    const handleSelectPortal = React.useCallback((portal: "citizen" | "admin", path: string) => {
        setLoadingPortal(portal);
        // Set cookie so Next.js server page knows which portal view to permit
        document.cookie = `active_portal=${portal}; path=/; max-age=86400; SameSite=Lax`;
        
        toast.success("Logged in successfully");
        
        // Premium transition effect matching LoginForm triggerLeave context
        setTimeout(() => {
            router.push(path);
        }, 800);
    }, [router]);


    const handleLogout = React.useCallback(async () => {
        setLoadingPortal("logout");
        // Clear the portal selection cookie
        document.cookie = "active_portal=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        toast.info("Logging out...");
        await signOut({ callbackUrl: "/auth/login" });
    }, []);


    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 md:space-y-10">
            <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                    Select Portal
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    Welcome, <span className="font-extrabold text-slate-700 dark:text-slate-200">{session?.user?.name || "Administrator"}</span>. 
                    Please choose which workspace you want to open for this session.
                </p>
            </div>

            {/* Premium Interactive Selection Cards */}
            <div className="space-y-4">
                 {/* Citizen Portal Card */}
                 <button
                     onClick={() => handleSelectPortal("citizen", "/")}
                     disabled={loadingPortal !== null}
                     className="w-full text-left p-6 bg-white dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl transition-all duration-300 group hover:scale-[1.02] active:scale-[0.99] flex items-center justify-between shadow-sm hover:shadow-xl hover:shadow-blue-500/5 focus:outline-none"
                     style={{ borderColor: loadingPortal === "citizen" ? themeColor : undefined }}
                 >
                     <div className="flex items-center gap-5">
                         <div 
                             className="p-4 rounded-2xl group-hover:scale-110 transition-transform"
                             style={{ 
                                 backgroundColor: `${themeColor}1a`, 
                                 color: themeColor 
                             }}
                         >
                             <Users className="w-7 h-7" />
                         </div>
                         <div className="space-y-1">
                             <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white italic">
                                 Citizen Portal
                             </h3>
                             <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-normal max-w-[280px]">
                                 File transaction requests, manage your clearances, check certificates, and pay taxes.
                             </p>
                         </div>
                     </div>
                     <div>
                         {loadingPortal === "citizen" ? (
                             <Loader2 className="w-5 h-5 animate-spin" style={{ color: themeColor }} />
                         ) : (
                             <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors group-hover:translate-x-1 duration-200" />
                         )}
                     </div>
                 </button>
 
                 {/* Admin Portal Card */}
                 <button
                     onClick={() => handleSelectPortal("admin", "/admin/dashboard")}
                     disabled={loadingPortal !== null}
                     className="w-full text-left p-6 bg-white dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl transition-all duration-300 group hover:scale-[1.02] active:scale-[0.99] flex items-center justify-between shadow-sm hover:shadow-xl hover:shadow-blue-500/5 focus:outline-none"
                     style={{ borderColor: loadingPortal === "admin" ? themeColor : undefined }}
                 >
                     <div className="flex items-center gap-5">
                         <div 
                             className="p-4 rounded-2xl group-hover:scale-110 transition-transform"
                             style={{ 
                                 backgroundColor: `${themeColor}1a`, 
                                 color: themeColor 
                             }}
                         >
                             <ShieldCheck className="w-7 h-7" />
                         </div>

                        <div className="space-y-1">
                            <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white italic">
                                Admin Dashboard
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-normal max-w-[280px]">
                                Access official controls, approve resident registries, review treasury ledgers, and manage statistics.
                            </p>
                        </div>
                    </div>
                    <div>
                        {loadingPortal === "admin" ? (
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: themeColor }} />
                        ) : (
                            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors group-hover:translate-x-1 duration-200" />
                        )}
                    </div>
                </button>
            </div>

            {/* Footer Logout Action */}
            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-center">
                <Button
                    onClick={handleLogout}
                    disabled={loadingPortal !== null}
                    variant="ghost"
                    className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2 hover:bg-transparent"
                >
                    {loadingPortal === "logout" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                    Log out of session
                </Button>
            </div>
        </div>
    );
}
