"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    managedBarangay?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), CONTENT_ADMIN, BARANGAY_ADMIN (scoped), or custom accessiblePages
 */
export async function verifyJobAccess(): Promise<{
    user: SessionUser;
    isBarangayAdmin: boolean;
    managedBarangay: string | null;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isContentAdmin = role === "CONTENT_ADMIN";
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/jobs");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage municipal job vacancies.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * 2. GET ALL JOBS (LEAN SELECT WITH BARANGAY SCOPING)
 */
export async function getAdminJobs(barangayFilter?: string) {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const whereClause: any = {};
        if (isBarangayAdmin && managedBarangay) {
            whereClause.barangay = managedBarangay;
        } else if (barangayFilter && barangayFilter !== "All") {
            whereClause.barangay = barangayFilter;
        }

        const jobs = await (prisma as any).job.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                department: true,
                location: true,
                description: true,
                qualifications: true,
                requirements: true,
                salary: true,
                employmentType: true,
                deadline: true,
                links: true,
                mapUrl: true,
                isActive: true,
                barangay: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: jobs, jobs };
    } catch (error: any) {
        console.error("[getAdminJobs] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch job postings." };
    }
}

/**
 * 3. GET JOB BY ID (FAST MODAL SYNC)
 */
export async function getJobById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Job ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const job = await (prisma as any).job.findUnique({
            where: { id }
        });

        if (!job) {
            return { success: false, error: "Job vacancy not found." };
        }

        if (isBarangayAdmin && job.barangay && job.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized access to job posting from another barangay." };
        }

        return { success: true, data: job, job };
    } catch (error: any) {
        console.error("[getJobById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch job details." };
    }
}

/**
 * 4. ADD JOB VACANCY + AUDIT LOGGING
 */
export async function addJob(formData: FormData) {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const title = (formData.get("title") as string)?.trim();
        const department = (formData.get("department") as string)?.trim();
        const location = (formData.get("location") as string)?.trim() || null;
        const description = (formData.get("description") as string)?.trim();
        const qualifications = (formData.get("qualifications") as string)?.trim();
        const requirements = (formData.get("requirements") as string)?.trim();
        const salary = (formData.get("salary") as string)?.trim() || null;
        const employmentType = (formData.get("employmentType") as string)?.trim() || "Full-Time";
        const deadlineStr = formData.get("deadline") as string;
        const deadline = deadlineStr ? new Date(deadlineStr) : null;
        const mapUrl = (formData.get("mapUrl") as string)?.trim() || null;

        const linksJson = formData.get("linksJson") as string;
        let links: any[] = [];
        try {
            links = linksJson ? JSON.parse(linksJson) : [];
        } catch {
            links = [];
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        if (!title || !department) {
            return { success: false, error: "Job title and department are required." };
        }

        const newJob = await (prisma as any).job.create({
            data: {
                title,
                department,
                location,
                description,
                qualifications,
                requirements,
                salary,
                employmentType,
                deadline,
                links,
                mapUrl,
                isActive: true,
                barangay
            }
        });

        revalidatePath("/");
        revalidatePath("/admin/jobs");
        revalidatePath("/jobs");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Job",
                entityId: newJob.id,
                entityName: title,
                description: `Posted municipal job vacancy: "${title}" (${department})`,
                metadata: {
                    title,
                    department,
                    employmentType,
                    salary,
                    barangay: barangay || "Municipal Wide"
                }
            });
        } catch (auditErr) {
            console.warn("[addJob] Audit log warning:", auditErr);
        }

        return { success: true, data: newJob, job: newJob };
    } catch (error: any) {
        console.error("[addJob] Error:", error);
        return { success: false, error: error?.message || "Failed to create job entry." };
    }
}

/**
 * 5. UPDATE JOB VACANCY + AUDIT STATE DIFFS
 */
export async function updateJob(id: string, formData: FormData) {
    try {
        if (!id) {
            return { success: false, error: "Job ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const existing = await (prisma as any).job.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Job vacancy not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to modify job posting from another barangay." };
        }

        const title = (formData.get("title") as string)?.trim();
        const department = (formData.get("department") as string)?.trim();
        const location = (formData.get("location") as string)?.trim() || null;
        const description = (formData.get("description") as string)?.trim();
        const qualifications = (formData.get("qualifications") as string)?.trim();
        const requirements = (formData.get("requirements") as string)?.trim();
        const salary = (formData.get("salary") as string)?.trim() || null;
        const employmentType = (formData.get("employmentType") as string)?.trim() || existing.employmentType;
        const deadlineStr = formData.get("deadline") as string;
        const deadline = deadlineStr ? new Date(deadlineStr) : null;
        const mapUrl = (formData.get("mapUrl") as string)?.trim() || null;

        const linksJson = formData.get("linksJson") as string;
        let links: any[] = existing.links || [];
        if (linksJson !== undefined) {
            try {
                links = linksJson ? JSON.parse(linksJson) : [];
            } catch {
                links = existing.links;
            }
        }

        let barangay = (formData.get("barangay") as string)?.trim() || existing.barangay;
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        const updatedJob = await (prisma as any).job.update({
            where: { id },
            data: {
                title: title || existing.title,
                department: department || existing.department,
                location,
                description: description !== undefined ? description : existing.description,
                qualifications: qualifications !== undefined ? qualifications : existing.qualifications,
                requirements: requirements !== undefined ? requirements : existing.requirements,
                salary,
                employmentType,
                deadline,
                links,
                mapUrl,
                barangay
            }
        });

        revalidatePath("/");
        revalidatePath("/admin/jobs");
        revalidatePath("/jobs");

        // Audit Logging with Full Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if ((existing.title || "") !== (title || "")) {
                changes["title"] = { old: existing.title, new: title };
            }
            if ((existing.department || "") !== (department || "")) {
                changes["department"] = { old: existing.department, new: department };
            }
            if ((existing.location || "") !== (location || "")) {
                changes["location"] = { old: existing.location || "None", new: location || "None" };
            }
            if ((existing.salary || "") !== (salary || "")) {
                changes["salary"] = { old: existing.salary || "None", new: salary || "None" };
            }
            if ((existing.employmentType || "") !== (employmentType || "")) {
                changes["employmentType"] = { old: existing.employmentType, new: employmentType };
            }
            if ((existing.description || "") !== (description || "")) {
                changes["description"] = { old: existing.description || "", new: description || "" };
            }
            if ((existing.qualifications || "") !== (qualifications || "")) {
                changes["qualifications"] = { old: existing.qualifications || "", new: qualifications || "" };
            }
            if ((existing.requirements || "") !== (requirements || "")) {
                changes["requirements"] = { old: existing.requirements || "", new: requirements || "" };
            }
            if ((existing.mapUrl || "") !== (mapUrl || "")) {
                changes["mapUrl"] = { old: existing.mapUrl || "None", new: mapUrl || "None" };
            }
            if ((existing.barangay || "") !== (barangay || "")) {
                changes["barangay"] = { old: existing.barangay || "Municipal-wide", new: barangay || "Municipal-wide" };
            }

            // Deadline Comparison
            const oldDeadlineIso = existing.deadline ? new Date(existing.deadline).toISOString().slice(0, 16) : null;
            const newDeadlineIso = deadline ? deadline.toISOString().slice(0, 16) : null;
            if (oldDeadlineIso !== newDeadlineIso) {
                changes["deadline"] = { 
                    old: oldDeadlineIso || "Until Filled", 
                    new: newDeadlineIso || "Until Filled" 
                };
            }

            // Links Comparison (Formatted cleanly for Audit Log Viewer)
            const oldLinksStr = JSON.stringify(existing.links || []);
            const newLinksStr = JSON.stringify(links || []);
            if (oldLinksStr !== newLinksStr) {
                const formatLinksToText = (items: any[]) => {
                    if (!items || !Array.isArray(items) || items.length === 0) return "No links attached";
                    return items
                        .map((l: any) => `• ${l.label || "Link"}: ${l.url || "No URL"}`)
                        .join("\n");
                };

                changes["links"] = { 
                    old: formatLinksToText(existing.links), 
                    new: formatLinksToText(links) 
                };
            }

            const modifiedFieldNames = Object.keys(changes);
            const descriptionSummary = modifiedFieldNames.length > 0
                ? `Updated job posting "${updatedJob.title}" (Modified: ${modifiedFieldNames.join(", ")})`
                : `Updated job posting "${updatedJob.title}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "Job",
                entityId: id,
                entityName: updatedJob.title,
                description: descriptionSummary,
                metadata: {
                    title: updatedJob.title,
                    changes,
                    previousTitle: existing.title
                }
            });
        } catch (auditErr) {
            console.warn("[updateJob] Audit log warning:", auditErr);
        }

        return { success: true, data: updatedJob, job: updatedJob };
    } catch (error: any) {
        console.error("[updateJob] Error:", error);
        return { success: false, error: error?.message || "Failed to update job entry." };
    }
}

/**
 * 6. TOGGLE JOB ACTIVE STATUS + AUDIT LOGGING
 */
export async function toggleJobStatus(id: string, isActive: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Job ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const existing = await (prisma as any).job.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Job vacancy not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to update status of another barangay posting." };
        }

        const updated = await (prisma as any).job.update({
            where: { id },
            data: { isActive }
        });

        revalidatePath("/admin/jobs");
        revalidatePath("/jobs");

        // Audit Logging
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Job",
                entityId: id,
                entityName: existing.title,
                description: `Changed job vacancy status of "${existing.title}" to ${isActive ? "Active" : "Closed"}`,
                metadata: {
                    title: existing.title,
                    changes: { isActive: { old: existing.isActive, new: isActive } }
                }
            });
        } catch (auditErr) {
            console.warn("[toggleJobStatus] Audit log warning:", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleJobStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to update job status." };
    }
}

/**
 * 7. DELETE JOB POSTING + AUDIT SNAPSHOT
 */
export async function deleteJob(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Job ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyJobAccess();

        const existing = await (prisma as any).job.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Job vacancy not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to delete job posting from another barangay." };
        }

        await (prisma as any).job.delete({
            where: { id }
        });

        revalidatePath("/");
        revalidatePath("/admin/jobs");
        revalidatePath("/jobs");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Job",
                entityId: id,
                entityName: existing.title,
                description: `Deleted job posting: "${existing.title}" (${existing.department})`,
                metadata: {
                    deletedRecordSnapshot: existing
                }
            });
        } catch (auditErr) {
            console.warn("[deleteJob] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteJob] Error:", error);
        return { success: false, error: error?.message || "Failed to delete job entry." };
    }
}
