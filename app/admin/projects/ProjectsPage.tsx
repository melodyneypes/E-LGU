"use client";

import { ProjectsProvider, Project, useProjects } from "./providers/ProjectsProvider";
import {
    ProjectsCards,
    ProjectsFilters,
    ProjectsTable,
    AddProjectModal,
} from "./components";
import { FolderKanban } from "lucide-react";
import type { CSSProperties } from "react";

interface ProjectsPageProps {
    initialData: Project[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    category: string;
    status: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}

export function ProjectsPage({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    category,
    status,
    currentBarangay,
    activeBarangays,
}: ProjectsPageProps) {
    return (
        <ProjectsProvider
            initialData={initialData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            status={status}
            currentBarangay={currentBarangay}
            activeBarangays={activeBarangays}
        >
            <ProjectsPageContent />
        </ProjectsProvider>
    );
}

function ProjectsPageContent() {
    const { themeColor } = useProjects();

    return (
        <div
            className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ "--primary-theme": themeColor } as CSSProperties}
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <FolderKanban className="mr-3 w-10 h-10 text-blue-600" />
                        Municipal Projects
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Track and showcase infrastructure, health, and social initiatives to the public.
                    </p>
                </div>
            </div>

            <ProjectsCards />

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <ProjectsFilters />
                <ProjectsTable />
            </div>

            <AddProjectModal />
        </div>
    );
}
