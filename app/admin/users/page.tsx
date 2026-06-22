import prisma from "@/lib/db/prisma";
import { UsersPage } from "./UsersPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const [users, themeColorSetting] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                isEmailVerified: true,
                role: true,
                rejectionCount: true,
                department: true,
                createdAt: true,
                accessiblePages: true,
                rfid: true,
                residentProfile: {
                    select: {
                        id: true,
                        registrationStatus: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.systemSetting.findUnique({
            where: { key: "theme_color" }
        })
    ]);

    const themeColor = themeColorSetting?.value;

    return <UsersPage users={users} themeColor={themeColor} />;
}
