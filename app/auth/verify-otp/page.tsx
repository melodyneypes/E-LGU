import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { AuthLayout } from "@/components/shared/AuthLayout";
import { VerifyOTPForm } from "@/components/auth/VerifyOTPForm";
import { SystemSetting, HeroSlide } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Verify Identity | EMapandan",
    description: "Verify your email address before setting up your account password.",
};

export default async function VerifyOTPPage() {
    const session = await getServerSession(authOptions);

    // Guard: Must be logged in to verify identity
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    // Guard: If password is already set, no need to verify OTP, redirect away
    if ((session.user as any).isPasswordChanged === true) {
        const role = (session.user as any).role;
        if (role === "USER") {
            redirect("/");
        } else {
            redirect("/admin/dashboard");
        }
    }

    const email = session.user.email || "";

    // Fetch EMapandan branding slides and settings
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

    return (
        <AuthLayout
            slides={slides}
            logoSrc={settings.site_logo}
            brandWord1={settings.brand_word_1}
            brandWord2={settings.brand_word_2}
            themeColor={themeColor}
        >
            <VerifyOTPForm email={email} themeColor={themeColor} />
        </AuthLayout>
    );
}
