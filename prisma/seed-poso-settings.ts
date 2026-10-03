import { PrismaClient } from "@prisma/client";
import lguConfig from "../config/lgu.config.json";

const prisma = new PrismaClient();

async function main() {
    console.log("⚙️ Upserting POSO Portal System Settings...");

    const posoSettings = [
        {
            key: "poso_location",
            value: lguConfig.poso.address,
            description: "Official POSO Office Address",
        },
        {
            key: "poso_hotline",
            value: lguConfig.poso.hotline,
            description: "POSO Emergency & Incident Hotline Numbers",
        },
        {
            key: "poso_operating_hour",
            value: lguConfig.poso.officeHours,
            description: "POSO Office Operating Hours",
        },
        {
            key: "poso_official_email",
            value: lguConfig.poso.email,
            description: "POSO Official Public Contact Email",
        },
        {
            key: "poso_facebook",
            value: lguConfig.social.posoFacebook,
            description: "POSO Official Facebook Page Link",
        },
    ];

    for (const setting of posoSettings) {
        await prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: {
                value: setting.value,
                description: setting.description,
            },
            create: setting,
        });
        console.log(`  ✓ Upserted POSO setting: ${setting.key}`);
    }

    console.log("✅ POSO System Settings successfully updated in database!");
}

main()
    .catch((e) => {
        console.error("❌ Failed to upsert POSO settings:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
