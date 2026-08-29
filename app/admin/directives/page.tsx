import { getExecutiveDirectives } from "./actions";
import { DirectivesClient } from "./components/DirectivesClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ExecutiveDirectivesPage(props: {
    searchParams: Promise<{
        search?: string;
        category?: string;
        priority?: string;
        targetScope?: string;
        targetBarangay?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const role = (session.user as any)?.role;
    const department = (session.user as any)?.department;
    const accessiblePages = (session.user as any)?.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department?.toUpperCase() === "LGU" || !department);
    const isMayor = role === "MAYOR";
    const hasPageAccess = accessiblePages.includes("/admin/directives");

    if (!isLguAdmin && !isMayor && !hasPageAccess) {
        redirect("/admin/dashboard");
    }

    const params = await props.searchParams;
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "ALL";
    const priority = params.priority || "ALL";
    const targetScope = params.targetScope || "ALL";
    const targetBarangay = params.targetBarangay || "ALL";

    const [res, barangaysList] = await Promise.all([
        getExecutiveDirectives({
            page,
            pageSize,
            search,
            category,
            priority,
            targetScope,
            targetBarangay,
        }),
        prisma.barangayInfo.findMany({
            select: { name: true },
            orderBy: { name: "asc" }
        })
    ]);

    const directives = res.success ? res.data : [];
    const totalCount = res.success ? res.totalCount : 0;
    const barangays = barangaysList.map((b) => b.name);

    return (
        <DirectivesClient
            initialData={directives as any[]}
            totalCount={totalCount || 0}
            barangays={barangays}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            priority={priority}
            targetScope={targetScope}
            targetBarangay={targetBarangay}
        />
    );
}
