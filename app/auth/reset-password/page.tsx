import { AuthLayout } from "@/components/shared/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { validateResetToken } from "@/app/auth/actions";
import prisma from "@/lib/db/prisma";
import { SystemSetting, HeroSlide } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Reset Password | E-LGU",
    description: "Set a new password for your E-LGU portal account.",
};

interface ResetPasswordPageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    const { token } = await searchParams;

    const slides: HeroSlide[] = await prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
    });

    const settingsList: SystemSetting[] = await prisma.systemSetting.findMany();
    const settings = settingsList.reduce((acc: Record<string, string>, curr: SystemSetting) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    const themeColor = settings.theme_color || "#2563eb";

    // Server-side token validation before rendering the form
    const validation = token ? await validateResetToken(token) : { valid: false, error: "No reset token provided." };

    return (
        <AuthLayout
            slides={slides}
            logoSrc={settings.site_logo}
            brandWord1={settings.brand_word_1}
            brandWord2={settings.brand_word_2}
            themeColor={themeColor}
        >
            {!validation.valid ? (
                // Invalid / Expired Token UI
                <div className="space-y-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl bg-red-500">
                            <span className="text-4xl">⛔</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                                Link Invalid
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                                {validation.error || "This reset link is invalid or has already been used."}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-sm space-y-1">
                        <p className="font-bold text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400">
                            What to do?
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                            Request a new password reset link from the login page. Reset links expire after 15 minutes and can only be used once.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href="/auth/forgot-password"
                            className="flex items-center justify-center w-full h-14 rounded-2xl font-black uppercase tracking-tighter italic text-xl text-white shadow-2xl active:scale-[0.97] transition-all duration-300"
                            style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}33` }}
                        >
                            Request New Link
                        </Link>
                        <Link
                            href="/auth/login"
                            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            ) : (
                // Valid Token — Show the form
                <ResetPasswordForm token={token!} themeColor={themeColor} />
            )}
        </AuthLayout>
    );
}
