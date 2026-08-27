import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface LogActivityParams {
    action:
        | "CREATE"
        | "UPDATE"
        | "DELETE"
        | "APPROVE"
        | "REJECT"
        | "RELEASE"
        | "DIGITIZE"
        | "PRINT"
        | "DOWNLOAD"
        | "LOGIN"
        | "STATUS_CHANGE"
        | "EVALUATION";
    entityType:
        | "Transaction"
        | "RealPropertyTax"
        | "BuildingPermit"
        | "BusinessPermit"
        | "Cedula"
        | "Resident"
        | "User"
        | "Official"
        | "Announcement"
        | "LegislativeDocument"
        | "Settings"
        | string;
    entityId?: string | null;
    entityName?: string | null;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
    // Optional override for background jobs or automated processes
    actorOverride?: {
        userId?: string;
        userName: string;
        userEmail?: string;
        userRole: string;
        department?: string;
    };
}

/**
 * Universal Activity & Audit Logger
 * Asynchronously logs administrative and municipal operations performed by non-USER accounts.
 * Executes safely in the background with zero impact on response performance.
 */
export async function logActivity(params: LogActivityParams) {
    try {
        let userId: string | null = null;
        let userName = "System Administrator";
        let userEmail: string | null = null;
        let userRole = "ADMIN";
        let department: string | null = "GENERAL";

        if (params.actorOverride) {
            userId = params.actorOverride.userId || null;
            userName = params.actorOverride.userName;
            userEmail = params.actorOverride.userEmail || null;
            userRole = params.actorOverride.userRole;
            department = params.actorOverride.department || "GENERAL";
        } else {
            const session = await getServerSession(authOptions);
            const user = session?.user as any;

            if (user) {
                userId = user.id || null;
                userName = user.name || user.email?.split("@")[0] || "Staff";
                userEmail = user.email || null;
                userRole = user.role || "ADMIN";
                department = user.department || (user.role === "ASSESSOR" ? "ASSESSOR" : user.role === "ENGINEER" ? "ENGINEERING" : "GENERAL");
            }
        }

        // Only log actions for administrative / non-USER roles unless explicitly specified
        if (userRole === "USER" && !params.actorOverride) {
            return;
        }

        await (prisma as any).auditLog.create({
            data: {
                userId,
                userName,
                userEmail,
                userRole,
                department,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId || null,
                entityName: params.entityName || null,
                description: params.description,
                metadata: params.metadata || {},
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            }
        });
    } catch (error) {
        // Non-blocking log failure - do not break primary transaction flow
        console.error("[AuditLog Error] Failed to persist activity log:", error);
    }
}
