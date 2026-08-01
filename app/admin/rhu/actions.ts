"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await getServerSession(authOptions);
}

export async function getMatchedCenterForUser(user: any) {
    if (!user) return null;
    const role = user.role;
    const userEmail = (user.email || "").toLowerCase();
    const userName = (user.name || "").toLowerCase();
    const userDept = (user.department || "").toLowerCase();
    const userIdStr = String(user.id);

    const isCenterStaff = role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "RHU_STAFF" ||
        userEmail.includes("lalas") || userName.includes("lalas") || userDept.includes("lalas");

    if (!isCenterStaff && role !== "ADMIN") return null;
    if (role === "ADMIN" && !userEmail.includes("lalas") && !userName.includes("lalas") && !userDept.includes("lalas")) {
        return null; // Global admin sees all unless specific center account
    }

    try {
        const centers: any[] = await prisma.$queryRaw`
            SELECT "id", "name", "code", "barangay", "accountEmail", "userId" FROM "RHUHealthCenter"
        `;

        // 1. Priority: keyword matching by email/name (prevents wrong userId DB links)
        const keywordMatch = centers.find((c: any) => {
            const centerNameLower = String(c.name || "").toLowerCase();
            return (
                (c.accountEmail && String(c.accountEmail).toLowerCase() === userEmail) ||
                (userEmail.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userName.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userDept.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userEmail.includes("main") && centerNameLower.includes("main"))
            );
        });

        if (keywordMatch) return keywordMatch;

        // 2. Fallback: userId match
        const userIdMatch = centers.find((c: any) =>
            c.userId && String(c.userId) === userIdStr
        );
        if (userIdMatch) return userIdMatch;

    } catch {}

    // 3. Virtual fallback by email/name keywords
    if (userEmail.includes("lalas") || userName.includes("lalas") || userDept.includes("lalas")) {
        return {
            id: "lalas-medical-clinic",
            name: "Lalas Medical Clinic",
            code: "RHU-LALAS",
            barangay: "Lalas"
        };
    }

    if (userEmail.includes("main") || userName.includes("main") || userDept.includes("main")) {
        return {
            id: "main-rhu",
            name: "Main Rural Health Unit (RHU)",
            code: "RHU-MAIN",
            barangay: "Poblacion"
        };
    }

    return null;
}

export async function getRHUAdminTransactions(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    checkupType?: string;
    allCenters?: boolean;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const status = params?.status || "ALL";
        const checkupType = params?.checkupType || "ALL";
        const showAllCenters = params?.allCenters === true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const skip = (page - 1) * limit;

        const andConditions: any[] = [];

        // Status Filter
        if (status === "CANCELLED") {
            andConditions.push({ OR: [{ isCancelled: true }, { status: "REJECTED" }] });
        } else if (status === "APPOINTMENT_BOOKED") {
            andConditions.push({ status: { in: ["FOR_INSPECTION", "FOR_REQUESTING"] } });
        } else if (status === "CHECK_IN") {
            andConditions.push({ status: "EVALUATED" });
        } else if (status === "IN_CONSULTATION") {
            andConditions.push({ status: "FOR_PROCESSING" });
        } else if (status === "PRESCRIBED") {
            andConditions.push({ status: "FOR_CLAIM" });
        } else if (status === "REFERRED") {
            andConditions.push({ additionalData: { path: ["rhuStatus"], equals: "REFERRED" } });
        } else if (status === "COMPLETED") {
            andConditions.push({
                status: { in: ["RELEASED", "DELIVERED"] },
                NOT: { additionalData: { path: ["rhuStatus"], equals: "REFERRED" } }
            });
        } else if (status !== "ALL") {
            andConditions.push({ status: status as any });
        }

        // Search Filter (Control Number, User Name, Patient Name, Barangay)
        if (search) {
            andConditions.push({
                OR: [
                    { controlNumber: { contains: search, mode: "insensitive" } },
                    { user: { name: { contains: search, mode: "insensitive" } } },
                    { user: { email: { contains: search, mode: "insensitive" } } },
                    { residentSnapshot: { path: ["firstName"], string_contains: search } },
                    { residentSnapshot: { path: ["lastName"], string_contains: search } },
                    { residentSnapshot: { path: ["barangay"], string_contains: search } },
                ]
            });
        }

        const whereClause: any = andConditions.length > 0 ? { AND: andConditions } : {};

        // Fetch all transactions (type filtering is done in JS below for reliability)
        const allTransactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        residentProfile: true
                    }
                },
                type: true
            },
            orderBy: { createdAt: "desc" },
            take: 1000
        });

        // Filter to RHU-only transactions in JS (robust against DB value variance)
        const RHU_KEYWORDS = ["rhu", "rural health", "medical consultation", "health certificate", "consultation", "checkup", "check-up"];
        const transactions = allTransactions.filter((tx: any) => {
            const typeCode = (tx.type?.code || "").toLowerCase();
            const typeCat = (tx.type?.category || "").toLowerCase();
            const typeName = (tx.type?.name || "").toLowerCase();
            let addData: any = {};
            if (typeof tx.additionalData === "string") {
                try { addData = JSON.parse(tx.additionalData); } catch {}
            } else {
                addData = tx.additionalData || {};
            }
            const hasRhuStatus = !!addData.rhuStatus;
            const hasCheckupType = !!addData.checkupType;
            const hasHealthCenter = !!addData.healthCenterName || !!addData.healthCenterId;

            if (hasRhuStatus || hasCheckupType || hasHealthCenter) return true;
            if (typeCode.startsWith("rhu_") || typeCode.includes("rhu")) return true;
            if (typeCat.includes("rhu") || typeCat.includes("health") || typeCat.includes("medical")) return true;
            if (RHU_KEYWORDS.some(kw => typeName.includes(kw))) return true;
            return false;
        });

        // Checkup Type Filter in JS (after RHU filter)
        let filteredByCheckup = transactions;
        if (checkupType && checkupType !== "ALL") {
            const checkupLower = checkupType.toLowerCase();
            filteredByCheckup = transactions.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const ct = (addData.checkupType || "").toLowerCase();
                return ct.includes(checkupLower) || checkupLower.includes(ct) ||
                    (checkupLower.includes("general") && (ct.includes("general") || ct === "general")) ||
                    (checkupLower.includes("marital") && ct.includes("marital")) ||
                    ((checkupLower.includes("prenatal") || checkupLower.includes("maternal")) && (ct.includes("prenatal") || ct.includes("maternal"))) ||
                    (checkupLower.includes("pediatric") && ct.includes("pediatric")) ||
                    (checkupLower.includes("dental") && ct.includes("dental"));
            });
        }

        const isPharmacy = session.user.role === "RHU_PHARMACY" ||
            ((session.user as any).department || "").toUpperCase().includes("PHARMACY");

        const matchedCenter = (showAllCenters || isPharmacy) ? null : await getMatchedCenterForUser(session.user);
        let finalData = filteredByCheckup;



        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerNameLower = (matchedCenter.name || "").toLowerCase();

            finalData = filteredByCheckup.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }

                const rawData = JSON.stringify(addData).toLowerCase();
                const txCenterId = String(addData.healthCenterId || "");
                const txCenterName = String(addData.healthCenterName || "").toLowerCase();

                if (txCenterId && txCenterId === centerId) return true;
                if (txCenterName && (txCenterName.includes(centerNameLower) || centerNameLower.includes(txCenterName))) return true;

                if (centerNameLower.includes("lalas")) {
                    if (txCenterName.includes("lalas") || rawData.includes("lalas")) return true;
                    if (!txCenterName && !txCenterId) return true;
                    return false;
                }

                if (centerNameLower.includes("main")) {
                    return txCenterName.includes("main") || rawData.includes("main") || (!txCenterName && !txCenterId);
                }

                return false;
            });
        }

        if (isPharmacy) {
            finalData = finalData.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = addData?.rhuStatus || tx.status;
                return rhuStatus === "PRESCRIBED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
            });
        }

        const total = finalData.length;
        const paginatedData = finalData.slice((page - 1) * limit, page * limit);

        return {
            success: true,
            data: paginatedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        };
    } catch (error: any) {
        console.error("getRHUAdminTransactions error:", error);
        return { success: false, error: error.message || "Failed to fetch RHU transactions." };
    }
}

export async function updateRHUAppointmentStatus(
    transactionId: string,
    status: string,
    remarks?: string,
    referralData?: { facility?: string; reason?: string },
    vitalsData?: {
        height?: string;
        weight?: string;
        systolic?: string;
        diastolic?: string;
        temperature?: string;
        pulseRate?: string;
        philhealthNumber?: string;
        konsultationNumber?: string;
    },
    deosData?: {
        diagnosis?: string;
        examinationFindings?: string;
        orders?: string;
        status?: string;
    }
) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!existing) {
            return { success: false, error: "Transaction not found." };
        }

        const isCancelled = status === "CANCELLED" || status === "REJECTED";

        let additionalData: any = {};
        if (existing.additionalData) {
            additionalData = typeof existing.additionalData === "string"
                ? JSON.parse(existing.additionalData)
                : { ...(existing.additionalData as any) };
        }

        additionalData.rhuStatus = status;

        if (vitalsData) {
            const h = parseFloat(vitalsData.height || "");
            const w = parseFloat(vitalsData.weight || "");
            let calculatedBmi: string | null = null;
            let calculatedCategory: string | null = null;
            if (h > 0 && w > 0) {
                const heightM = h / 100;
                const bmiVal = w / (heightM * heightM);
                calculatedBmi = bmiVal.toFixed(1);
                if (bmiVal < 18.5) calculatedCategory = "Underweight";
                else if (bmiVal <= 24.9) calculatedCategory = "Normal weight";
                else if (bmiVal <= 29.9) calculatedCategory = "Overweight";
                else calculatedCategory = "Obese";
            }

            additionalData.vitals = {
                height: vitalsData.height || null,
                weight: vitalsData.weight || null,
                bmi: calculatedBmi,
                bmiCategory: calculatedCategory,
                bloodPressure: (vitalsData.systolic && vitalsData.diastolic)
                    ? `${vitalsData.systolic}/${vitalsData.diastolic}`
                    : null,
                systolic: vitalsData.systolic || null,
                diastolic: vitalsData.diastolic || null,
                temperature: vitalsData.temperature || null,
                pulseRate: vitalsData.pulseRate || null,
                philhealthNumber: vitalsData.philhealthNumber || null,
                konsultationNumber: vitalsData.konsultationNumber || null,
            };
            additionalData.checkedInAt = new Date().toISOString();
        }

        if (deosData) {
            additionalData.deos = {
                diagnosis: deosData.diagnosis || null,
                examinationFindings: deosData.examinationFindings || null,
                orders: deosData.orders || null,
                status: deosData.status || null,
            };
            additionalData.prescribedAt = new Date().toISOString();
        }

        if (referralData) {
            if (referralData.facility) additionalData.referralFacility = referralData.facility;
            if (referralData.reason) additionalData.referralReason = referralData.reason;
            additionalData.referredAt = new Date().toISOString();
        }

        const dbStatusMap: Record<string, any> = {
            "APPOINTMENT_BOOKED": "FOR_INSPECTION",
            "CHECK_IN": "EVALUATED",
            "IN_CONSULTATION": "FOR_PROCESSING",
            "PRESCRIBED": "FOR_CLAIM",
            "REFERRED": "RELEASED",
            "COMPLETED": "RELEASED",
            "CANCELLED": "REJECTED"
        };
        const targetDbStatus = dbStatusMap[status] || (isCancelled ? "REJECTED" : (status as any));

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: targetDbStatus,
                isCancelled,
                rejectionRemarks: remarks || null,
                additionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/rhu");
        revalidatePath("/admin/rhu/consultations");
        revalidatePath(`/admin/rhu/${transactionId}`);
        revalidatePath("/user/appointment");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateRHUAppointmentStatus error:", error);
        return { success: false, error: error.message || "Failed to update appointment status." };
    }
}

export async function getRHUDashboardStats() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const baseWhere: any = {
            OR: [
                {
                    type: {
                        category: {
                            in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT", "Health Unit", "Health Services"]
                        }
                    }
                },
                { type: { code: { startsWith: "RHU_" } } },
                { type: { name: { contains: "Medical Consultation" } } }
            ]
        };

        const isPharmacy = session.user.role === "RHU_PHARMACY" ||
            ((session.user as any).department || "").toUpperCase().includes("PHARMACY");
        const matchedCenter = isPharmacy ? null : await getMatchedCenterForUser(session.user);
        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerName = matchedCenter.name;
            const centerNameLower = centerName.toLowerCase();

            const centerOrConditions: any[] = [
                { additionalData: { path: ["healthCenterId"], equals: centerId } },
                { additionalData: { path: ["healthCenterName"], equals: centerName } },
                { additionalData: { path: ["healthCenterName"], string_contains: centerName } }
            ];

            if (centerNameLower.includes("lalas")) {
                centerOrConditions.push(
                    { additionalData: { path: ["healthCenterName"], string_contains: "Lalas" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "lalas" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "LALAS" } }
                );
            } else if (centerNameLower.includes("main") || centerNameLower.includes("community")) {
                centerOrConditions.push(
                    { additionalData: { path: ["healthCenterName"], string_contains: "Main" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "main" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "MAIN" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "Community" } }
                );
            }

            baseWhere.AND = [
                {
                    OR: centerOrConditions
                }
            ];
        }

        const [total, booked, checkedIn, inConsultation, prescribed, referred, completed, cancelled] = await Promise.all([
            prisma.transaction.count({ where: baseWhere }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: { in: ["FOR_INSPECTION", "FOR_REQUESTING"] } }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: "EVALUATED" }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: "FOR_PROCESSING" }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: "FOR_CLAIM" }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, additionalData: { path: ["rhuStatus"], equals: "REFERRED" } }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere,
                    isCancelled: false,
                    status: { in: ["RELEASED", "DELIVERED"] },
                    NOT: { additionalData: { path: ["rhuStatus"], equals: "REFERRED" } }
                }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, OR: [{ isCancelled: true }, { status: "REJECTED" }] }
            })
        ]);

        return {
            success: true,
            stats: {
                total,
                booked,
                checkedIn,
                inConsultation,
                prescribed,
                referred,
                completed,
                cancelled,
                pending: booked + checkedIn,
                confirmed: inConsultation + prescribed
            }
        };
    } catch (error: any) {
        console.error("getRHUDashboardStats error:", error);
        return { success: false, error: error.message || "Failed to fetch stats." };
    }
}
