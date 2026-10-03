import { AuthLayout } from "@/components/shared/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import prisma from "@/lib/db/prisma";
import { SystemSetting, HeroSlide } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Forgot Password | E-LGU",
    description: "Reset your E-LGU portal account password.",
};

export default async function ForgotPasswordPage() {
    const slides: HeroSlide[] = await prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
    });

    const settingsList: SystemSetting[] = await prisma.systemSetting.findMany();
    const settings = settingsList.reduce((acc: Record<string, string>, curr: SystemSetting) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    return (
        <AuthLayout
            slides={slides}
            logoSrc={settings.site_logo}
            brandWord1={settings.brand_word_1}
            brandWord2={settings.brand_word_2}
            themeColor={settings.theme_color}
        >
            <ForgotPasswordForm themeColor={settings.theme_color} />
        </AuthLayout>
    );
}
