import React, { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getRegistrarFeedbackAction } from "./actions";
import RegistrarFeedbackClient from "./RegistrarFeedbackClient";
import RegistrarFeedbackSkeleton from "./components/RegistrarFeedbackSkeleton";

export const metadata: Metadata = {
    title: "Citizen Feedback | Civil Registrar",
    description: "Monitor public satisfaction levels, review star ratings, and evaluate citizen suggestions for Mapandan Civil Registry and PSA services.",
};

export default async function RegistrarFeedbackPage(props: {
    searchParams: Promise<{
        rating?: string;
        search?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const isAllowed =
        user?.role === "ADMIN" ||
        user?.role === "ADMIN_AIDE";

    if (!isAllowed) {
        redirect("/admin/dashboard");
    }

    const params = await props.searchParams;

    const rating = params.rating || "ALL";
    const search = params.search || "";
    const from = params.from || undefined;
    const to = params.to || undefined;
    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 10;

    // Get theme color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    // Initial Server Fetch
    const result = await getRegistrarFeedbackAction({
        rating,
        search,
        from,
        to,
        page,
        limit
    });

    const feedbacks = result.success && result.data ? result.data : [];
    const pagination = result.pagination || {
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10
    };
    const stats = result.stats || {
        totalFeedbacks: 0,
        averageRating: 0,
        csatPercentage: 0,
        ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Civil Registrar Citizen Feedback
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Monitor public satisfaction levels, review star ratings, and evaluate citizen feedback for Birth, Death, Marriage, and PSA certifications.
                </p>
            </div>

            {/* Main Interactive Feedback Client Dashboard with Suspense Fallback */}
            <Suspense fallback={<RegistrarFeedbackSkeleton />}>
                <RegistrarFeedbackClient
                    initialData={feedbacks}
                    pagination={pagination}
                    stats={stats}
                    themeColor={themeColor}
                />
            </Suspense>
        </div>
    );
}
