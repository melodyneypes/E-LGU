import { AuthLayout } from "@/components/shared/AuthLayout";
import { SetupPasswordForm } from "@/components/auth/SetupPasswordForm";
import prisma from "@/lib/db/prisma";
import { SystemSetting, HeroSlide } from "@prisma/client";
import Link from "next/link";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Setup Password | EMapandan",
    description: "Secure your EMapandan account by completing your initial password setup.",
};

interface SetupPasswordPageProps {
    searchParams: Promise<{ email?: string; token?: string }>;
}

function validateSetupToken(email: string | undefined, token: string | undefined) {
    if (!email || !token) {
        return { valid: false, error: "Missing required setup parameters." };
    }

    try {
        const parts = token.split(":");
        if (parts.length !== 3) {
            return { valid: false, error: "Invalid setup link format." };
        }

        const [msgEmail, msgExpiry, signature] = parts;
        if (msgEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
            return { valid: false, error: "Setup link does not match this account." };
        }

        if (Date.now() > parseInt(msgExpiry, 10)) {
            return { valid: false, error: "Your setup session has expired. Please log in again to request a new verification code." };
        }

        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            throw new Error("NEXTAUTH_SECRET is not configured in the environment variables.");
        }
        const expectedSignature = crypto.createHmac("sha256", secret)
            .update(`${msgEmail}:${msgExpiry}`)
            .digest("hex");

        if (signature !== expectedSignature) {
            return { valid: false, error: "Invalid security signature on the setup link." };
        }

        return { valid: true };
    } catch (e) {
        console.error("Token verification error:", e);
        return { valid: false, error: "An error occurred verifying the link." };
    }
}

export default async function SetupPasswordPage({ searchParams }: SetupPasswordPageProps) {
    const { email, token } = await searchParams;

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

    // Server-side validation of the verification token
    const validation = validateSetupToken(email, token);

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
                            <span className="text-4xl text-white">⛔</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tighter italic text-slate-900 dark:text-white uppercase leading-none">
                                Unauthorized Link
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                                {validation.error}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-sm space-y-1">
                        <p className="font-bold text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400">
                            Security Alert
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                            Access to the setup page is strictly restricted. Verification links are cryptographically signed, valid only for 15 minutes, and cannot be reused or modified.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href="/auth/login"
                            className="flex items-center justify-center w-full h-14 rounded-2xl font-black uppercase tracking-tighter italic text-xl text-white shadow-2xl active:scale-[0.97] transition-all duration-300"
                            style={{ backgroundColor: themeColor, boxShadow: `0 25px 50px -12px ${themeColor}33` }}
                        >
                            Return to Login
                        </Link>
                    </div>
                </div>
            ) : (
                // Valid Token — Show the form
                <SetupPasswordForm email={email!} token={token!} themeColor={themeColor} />
            )}
        </AuthLayout>
    );
}
