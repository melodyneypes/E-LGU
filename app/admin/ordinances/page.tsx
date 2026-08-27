import { getLegislativeDocuments } from "./actions";
import { OrdinancesClient } from "./components/OrdinancesClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        type?: string;
        status?: string;
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
    const isContentAdmin = role === "CONTENT_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/ordinances");

    if (!isLguAdmin && !isContentAdmin && !hasPageAccess) {
        redirect("/admin/dashboard");
    }

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const type = params.type || "ALL";
    const status = params.status || "ALL";

    const res = await getLegislativeDocuments({
        page,
        pageSize,
        search,
        type,
        status,
    });

    const documents = res.success ? res.data : [];
    const totalCount = res.success ? res.totalCount : 0;

    return (
        <OrdinancesClient
            initialData={documents as any[]}
            totalCount={totalCount || 0}
            page={page}
            pageSize={pageSize}
            search={search}
            type={type}
            status={status}
        />
    );
}
