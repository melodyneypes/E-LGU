import { AuthLayout } from "@/components/shared/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import prisma from "@/lib/db/prisma";
import { HeroSlide, SystemSetting } from "@prisma/client"; // Import Prisma types

export const dynamic = "force-dynamic";

export default async function LoginPage() {
    const slides: HeroSlide[] = await prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
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
            <LoginForm themeColor={settings.theme_color} />
        </AuthLayout>
    );
}
