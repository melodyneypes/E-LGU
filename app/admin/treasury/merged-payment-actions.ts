"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/storage";
import { sanitizeString } from "@/lib/validation";
import { sendEmail } from "@/lib/mail";

const isUserAdminAide = (u: any) =>
    u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

export interface SiblingAppointment {
    id: string;
    serviceName: string;
    serviceCategory: string;
    serviceCode: string;
    amount: number;
    appointmentDate: string;
    appointmentSlot: string;
    reference: string;
    status: string;
    citizenName: string;
    isPayable: boolean;
    unpayableReason?: string;
}

export interface SameDayAppointmentsResult {
    success: boolean;
    primary?: {
        id: string;
        serviceName: string;
        serviceCategory: string;
        amount: number;
        citizenName: string;
        appointmentDate: string;
    };
    siblings: SiblingAppointment[];
    error?: string;
}

/**
 * Evaluates whether a transaction is truly ready for Treasury payment collection.
 * Protects against unassessed fees, unscanned appointments, or transactions still
 * being processed by other departments (BPLO inspection, Civil Registrar review, Assessor, etc.).
 */
function evaluateTransactionPayability(tx: {
    status: string;
    totalAmount?: any;
    additionalData?: any;
    type?: { code?: string; category?: string; name?: string } | null;
    [key: string]: any;
}): { isPayable: boolean; unpayableReason?: string } {
    const add = (tx.additionalData as any) || {};
    const amount = Number(tx.totalAmount || add.calculatedTax?.totalAmount || add.totalTaxDue || add.realPropertyTax?.totalTaxDue || 0);
    const code = (tx.type?.code || "").toUpperCase();
    const category = (tx.type?.category || "").toUpperCase();

    // 1. Fee must be assessed and greater than 0
    if (amount <= 0) {
        return { isPayable: false, unpayableReason: "Fee not assessed yet" };
    }

    // 2. Base status must not be a settled, revision, or non-active state
    const nonPayableStatuses = [
        "PAID", "RELEASED", "REJECTED", "CANCELLED", "COMPLETED", "RETURNED", "REFUNDED",
        "FOR_REVISION", "DRAFT"
    ];
    if (nonPayableStatuses.includes(tx.status)) {
        if (tx.status === "FOR_REVISION") {
            return { isPayable: false, unpayableReason: "Returned for revision" };
        }
        if (tx.status === "PAID" || tx.status === "RELEASED" || tx.status === "COMPLETED") {
            return { isPayable: false, unpayableReason: "Already paid & released" };
        }
        return { isPayable: false, unpayableReason: `Status: ${tx.status.replace(/_/g, " ")}` };
    }

    // 3. KIOSK SCAN CHECK:
    // Every appointment must be physically scanned/checked in at the kiosk today
    const isCheckedIn = Boolean(
        add.checkedIn === true ||
        add.checkedInAt ||
        add.checkInData ||
        add.kioskCheckIn ||
        add.checkInTime ||
        (tx as any).checkedIn === true
    );
    if (!isCheckedIn) {
        return { isPayable: false, unpayableReason: "Awaiting kiosk scan" };
    }

    const rawCheckIn =
        add.checkedInAt ||
        add.checkInTime ||
        (typeof add.checkInData === "object" ? add.checkInData?.time : null) ||
        (tx as any).checkedInAt;

    if (rawCheckIn) {
        const checkInDate = new Date(rawCheckIn);
        if (!isNaN(checkInDate.getTime())) {
            const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
            const checkInPh = new Date(checkInDate.getTime() + PH_OFFSET_MS);
            const nowPh = new Date(Date.now() + PH_OFFSET_MS);
            const isScannedToday =
                checkInPh.getUTCFullYear() === nowPh.getUTCFullYear() &&
                checkInPh.getUTCMonth() === nowPh.getUTCMonth() &&
                checkInPh.getUTCDate() === nowPh.getUTCDate();

            if (!isScannedToday) {
                return { isPayable: false, unpayableReason: "Not scanned today" };
            }
        }
    }

    // 4. SERVICE-SPECIFIC PAYMENT READINESS:

    // A. Business Permits
    const isBusinessPermit =
        code.startsWith("BUSINESS_PERMIT") ||
        category.includes("BUSINESS") ||
        code.includes("BUSINESS");

    if (isBusinessPermit) {
        const validStatuses = ["FOR_PROCESSING", "UNPAID", "EVALUATED", "FOR_PAYMENT"];
        if (!validStatuses.includes(tx.status)) {
            if (tx.status === "FOR_INSPECTION") {
                return { isPayable: false, unpayableReason: "Pending BPLO inspection" };
            }
            if (tx.status === "FOR_REINSPECTION") {
                return { isPayable: false, unpayableReason: "In re-inspection" };
            }
            if (tx.status === "FOR_CLAIM" || tx.status === "FOR_PICKING") {
                return { isPayable: false, unpayableReason: "Ready for pickup (Paid)" };
            }
            return { isPayable: false, unpayableReason: "Not ready for payment" };
        }
        if (add.servingDepartment && add.servingDepartment !== "Treasury" && add.servingDepartment !== "Cashier") {
            return { isPayable: false, unpayableReason: `With ${add.servingDepartment}` };
        }
        return { isPayable: true };
    }

    // B. Civil Registry (LCR - Birth, Death, Marriage, PSA Appointments, Endorsements)
    const isLcr =
        code.startsWith("LCR_") ||
        code.startsWith("CIVIL_REGISTRY") ||
        category.includes("CIVIL") ||
        category.includes("REGISTRY");

    if (isLcr) {
        const validStatuses = ["FOR_PROCESSING", "UNPAID", "EVALUATED", "FOR_PAYMENT"];
        if (!validStatuses.includes(tx.status)) {
            if (tx.status === "FOR_REQUESTING" || tx.status === "UNDER_REVIEW") {
                return { isPayable: false, unpayableReason: "Pending LCR review" };
            }
            if (tx.status === "FOR_INSPECTION") {
                return { isPayable: false, unpayableReason: "Pending LCR verification" };
            }
            return { isPayable: false, unpayableReason: "Not ready for payment" };
        }

        const isAppointmentOrReg =
            code.includes("APPOINTMENT") ||
            code.includes("PSA") ||
            code.includes("REG") ||
            code.includes("LICENSE") ||
            add.registryType;

        if (isAppointmentOrReg) {
            const isTransferred =
                add.servingDepartment === "Treasury" ||
                add.appointmentAttended === true ||
                Boolean(add.transferredToTreasuryAt);

            if (!isTransferred) {
                return {
                    isPayable: false,
                    unpayableReason: add.servingDepartment === "Registrar"
                        ? "Awaiting Registrar"
                        : "Not forwarded to Treasury"
                };
            }
        }
        return { isPayable: true };
    }

    // C. POSO (Traffic Citations / Fines)
    const isPoso =
        code === "POSO_TRAFFIC_FINE" ||
        code.startsWith("POSO") ||
        category === "POSO";

    if (isPoso) {
        const validStatuses = ["UNPAID", "FOR_PROCESSING", "EVALUATED", "FOR_PAYMENT", "PENDING"];
        if (!validStatuses.includes(tx.status)) {
            return { isPayable: false, unpayableReason: "Not ready for payment" };
        }
        if (add.isDisputed || add.disputeStatus === "PENDING" || add.isContested) {
            return { isPayable: false, unpayableReason: "Ticket under dispute" };
        }
        return { isPayable: true };
    }

    // D. Real Property Tax (RPT)
    const isRpt =
        code.startsWith("RPT_") ||
        code.includes("RPT") ||
        category === "RPT";

    if (isRpt) {
        const validStatuses = ["FOR_PROCESSING", "UNPAID", "EVALUATED", "FOR_PAYMENT"];
        if (!validStatuses.includes(tx.status)) {
            if (tx.status === "FOR_REQUESTING" || tx.status === "FOR_EVALUATION") {
                return { isPayable: false, unpayableReason: "Awaiting Assessor assessment" };
            }
            if (tx.status === "UNDER_REVIEW") {
                return { isPayable: false, unpayableReason: "Under assessment review" };
            }
            return { isPayable: false, unpayableReason: "Not ready for payment" };
        }
        if (add.servingDepartment === "Assessor" || add.assessorStatus === "PENDING") {
            return { isPayable: false, unpayableReason: "With Municipal Assessor" };
        }
        return { isPayable: true };
    }

    // E. Engineering / Building Permits & Zoning
    const isEngineering =
        category.includes("ENGINEERING") ||
        category.includes("ZONING") ||
        code.includes("BUILDING") ||
        code.includes("OCCUPANCY") ||
        code.includes("FENCING");

    if (isEngineering) {
        const validStatuses = ["FOR_PROCESSING", "UNPAID", "EVALUATED", "FOR_PAYMENT"];
        if (!validStatuses.includes(tx.status)) {
            if (tx.status === "FOR_INSPECTION" || tx.status === "FOR_REINSPECTION") {
                return { isPayable: false, unpayableReason: "Pending engineering inspection" };
            }
            return { isPayable: false, unpayableReason: "Not ready for payment" };
        }
        if (add.servingDepartment && add.servingDepartment !== "Treasury" && add.servingDepartment !== "Cashier") {
            return { isPayable: false, unpayableReason: `With ${add.servingDepartment}` };
        }
        return { isPayable: true };
    }

    // F. General Services / Cedula
    const validStatuses = ["FOR_PROCESSING", "UNPAID", "EVALUATED", "FOR_PAYMENT"];
    if (!validStatuses.includes(tx.status)) {
        if (tx.status === "FOR_REQUESTING") {
            return { isPayable: false, unpayableReason: "Awaiting evaluation" };
        }
        return { isPayable: false, unpayableReason: "Not ready for payment" };
    }

    return { isPayable: true };
}

/**
 * Fetches other appointments/transactions belonging to the same citizen on the same day
 * that are currently pending payment ("FOR PAYMENT").
 */
export async function getSameDayPendingAppointments(
    transactionId: string
): Promise<SameDayAppointmentsResult> {
    try {
        if (!transactionId) {
            return { success: false, siblings: [], error: "Transaction ID is required." };
        }

        const primary = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                type: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!primary) {
            return { success: false, siblings: [], error: "Transaction not found." };
        }

        // Determine citizen identification
        const resident = (primary.residentSnapshot as any) || {};
        const pFirstName = (resident.firstName || "").trim().toLowerCase();
        const pLastName = (resident.lastName || "").trim().toLowerCase();
        const citizenName = pFirstName && pLastName
            ? `${resident.firstName} ${resident.lastName}`
            : (primary.user?.name || "Citizen");

        // Determine target calendar day in Philippine Time (UTC+8)
        const rawTarget = primary.appointmentDate || primary.createdAt;
        const targetDate = rawTarget && !isNaN(new Date(rawTarget).getTime()) ? new Date(rawTarget) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
        const getPhDayString = (dateVal?: Date | string | null) => {
            if (!dateVal) return null;
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return null;
            const phTime = new Date(d.getTime() + PH_OFFSET_MS);
            return phTime.toISOString().slice(0, 10);
        };
        const targetPhDay = getPhDayString(targetDate) || getPhDayString(new Date());

        // Build base query for active general transactions on the same day (including RPT, POSO, Business Permits, Civil Registry)
        const whereClause: any = {
            id: { not: primary.id },
            isPaid: false,
            isCancelled: false,
            status: {
                notIn: [
                    "PAID",
                    "RELEASED",
                    "REJECTED",
                    "CANCELLED",
                    "COMPLETED",
                    "RETURNED",
                    "REFUNDED",
                    "FOR_REVISION",
                    "DRAFT"
                ]
            },
            OR: [
                ...(primary.userId ? [{ userId: primary.userId }] : []),
                { appointmentDate: { gte: startOfDay, lte: endOfDay } },
                { createdAt: { gte: startOfDay, lte: endOfDay } },
                { updatedAt: { gte: startOfDay, lte: endOfDay } }
            ]
        };

        // Fetch candidate transactions
        const candidates = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                type: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        // Filter candidates by citizen identity and calendar day
        const matchedSiblings: SiblingAppointment[] = [];

        for (const candidate of candidates) {
            let isCitizenMatch = false;

            // 1. Match by User ID
            if (primary.userId && candidate.userId && primary.userId === candidate.userId) {
                isCitizenMatch = true;
            }

            // 2. Fallback: Match by resident snapshot first and last name
            if (!isCitizenMatch && pFirstName && pLastName) {
                const cResident = (candidate.residentSnapshot as any) || {};
                const cFirst = (cResident.firstName || "").trim().toLowerCase();
                const cLast = (cResident.lastName || "").trim().toLowerCase();
                if (cFirst === pFirstName && cLast === pLastName) {
                    isCitizenMatch = true;
                }
            }

            // 3. Fallback: Match by user account display name
            if (!isCitizenMatch && primary.user?.name && candidate.user?.name) {
                if (primary.user.name.trim().toLowerCase() === candidate.user.name.trim().toLowerCase()) {
                    isCitizenMatch = true;
                }
            }

            // 4. Fallback: Match by applicantName in additionalData
            if (!isCitizenMatch) {
                const pApp = ((primary.additionalData as any)?.applicantName || "").trim().toLowerCase();
                const cApp = ((candidate.additionalData as any)?.applicantName || "").trim().toLowerCase();
                if (pApp && cApp && pApp === cApp) {
                    isCitizenMatch = true;
                }
            }

            if (isCitizenMatch) {
                const cAdditional = (candidate.additionalData as any) || {};

                // Strictly verify same calendar day (Philippine Time UTC+8)
                const candApptDay = getPhDayString(candidate.appointmentDate);
                const candCheckInDay = getPhDayString(
                    cAdditional.checkedInAt || cAdditional.checkInTime || (candidate as any).checkedInAt
                );
                const candCreatedDay = getPhDayString(candidate.createdAt);

                const isSameCalendarDay =
                    (candApptDay && candApptDay === targetPhDay) ||
                    (candCheckInDay && candCheckInDay === targetPhDay) ||
                    (!candidate.appointmentDate && candCreatedDay === targetPhDay);

                if (!isSameCalendarDay) {
                    continue;
                }

                const cResident = (candidate.residentSnapshot as any) || {};

                const cCitizenName = cResident.firstName && cResident.lastName
                    ? `${cResident.firstName} ${cResident.lastName}`
                    : (candidate.user?.name || citizenName);

                const ref =
                    cAdditional.paymentId ||
                    cAdditional.reference_number ||
                    cAdditional.gcashReferenceNo ||
                    candidate.paymentReference ||
                    candidate.queueNumber ||
                    candidate.id.slice(-8).toUpperCase();

                const candAmount = Number(
                    candidate.totalAmount ||
                    cAdditional.calculatedTax?.totalAmount ||
                    cAdditional.totalTaxDue ||
                    cAdditional.realPropertyTax?.totalTaxDue ||
                    0
                );

                // Determine if this appointment is ready for payment (Treasury can issue an O.R.)
                const evalResult = evaluateTransactionPayability(candidate);
                const isPayable = evalResult.isPayable;
                const unpayableReason = evalResult.unpayableReason;

                matchedSiblings.push({
                    id: candidate.id,
                    serviceName: candidate.type?.name || "Municipal Service Fee",
                    serviceCategory: candidate.type?.category || "General",
                    serviceCode: candidate.type?.code || "GENERAL",
                    amount: candAmount,
                    appointmentDate: candidate.appointmentDate
                        ? candidate.appointmentDate.toISOString()
                        : candidate.createdAt.toISOString(),
                    appointmentSlot: candidate.appointmentSlot || "Walk-in / Open Slot",
                    reference: ref,
                    status: candidate.status,
                    citizenName: cCitizenName,
                    isPayable,
                    unpayableReason
                });
            }
        }

        const primaryAdd = (primary.additionalData as any) || {};
        const primaryAmount = Number(
            primary.totalAmount ||
            primaryAdd.calculatedTax?.totalAmount ||
            primaryAdd.totalTaxDue ||
            primaryAdd.realPropertyTax?.totalTaxDue ||
            0
        );

        return {
            success: true,
            primary: {
                id: primary.id,
                serviceName: primary.type?.name || "Municipal Service Fee",
                serviceCategory: primary.type?.category || "General",
                amount: primaryAmount,
                citizenName,
                appointmentDate: targetDate.toISOString()
            },
            siblings: matchedSiblings
        };
    } catch (error: any) {
        console.error("Failed to query same-day pending appointments:", error);
        return {
            success: false,
            siblings: [],
            error: error.message || "Failed to query same-day appointments."
        };
    }
}

/**
 * Confirms payment for multiple same-day appointments under a single Official Receipt (O.R.).
 * Runs inside an atomic Prisma transaction to guarantee non-destructive data integrity.
 */
export async function confirmMergedTreasuryPaymentAction(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER")) {
            return { success: false, error: "Unauthorized: Only Treasury staff can confirm payments." };
        }

        const primaryIdRaw = formData.get("primaryId");
        const primaryId = primaryIdRaw ? sanitizeString(String(primaryIdRaw)) : "";
        const selectedIdsRaw = formData.get("selectedIds") as string;
        const orSeriesNumberRaw = formData.get("orSeriesNumber");
        const orSeriesNumber = orSeriesNumberRaw ? sanitizeString(String(orSeriesNumberRaw)) : "";
        const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";
        const paymentReferenceInput = formData.get("paymentReference") as string;
        const remarks = formData.get("remarks") as string;
        const ctcNumberRaw = formData.get("ctcNumber");
        const ctcNumber = ctcNumberRaw ? sanitizeString(String(ctcNumberRaw)) : "";
        const orFile = formData.get("orFile");
        const receiptFile = formData.get("receiptFile");

        if (!primaryId) {
            return { success: false, error: "Primary transaction ID is required." };
        }
        if (!orSeriesNumber) {
            return { success: false, error: "Official Receipt (O.R.) Series Number is required." };
        }

        let selectedSiblingIds: string[] = [];
        if (selectedIdsRaw) {
            try {
                const parsed = JSON.parse(selectedIdsRaw);
                if (Array.isArray(parsed)) {
                    selectedSiblingIds = parsed;
                }
            } catch {
                selectedSiblingIds = [];
            }
        }

        // Combine primary and selected sibling IDs without duplicates
        const allTxIds = Array.from(new Set([primaryId, ...selectedSiblingIds])).map(sanitizeString);

        // Upload files once if provided
        let orDocumentUrl: string | undefined = undefined;
        if (orFile && typeof orFile === "object" && "size" in orFile && (orFile as any).size > 0) {
            const timestamp = Date.now();
            const fileName = (orFile as any).name ? (orFile as any).name.replace(/[^a-zA-Z0-9.-]/g, "_") : "or_document.pdf";
            const path = `treasury/or/${primaryId}/${timestamp}-${fileName}`;
            orDocumentUrl = (await uploadFile(orFile as File, path)) || undefined;
        }

        let treasuryReceiptUrl: string | undefined = undefined;
        if (receiptFile && typeof receiptFile === "object" && "size" in receiptFile && (receiptFile as any).size > 0) {
            const timestamp = Date.now();
            const fileName = (receiptFile as any).name ? (receiptFile as any).name.replace(/[^a-zA-Z0-9.-]/g, "_") : "receipt_document.pdf";
            const path = `treasury/receipts/${primaryId}/${timestamp}-${fileName}`;
            treasuryReceiptUrl = (await uploadFile(receiptFile as File, path)) || undefined;
        }

        // Map payment type enum
        let mappedPaymentType: any = "CASH";
        const methodUpper = paymentMethod.toUpperCase();
        if (methodUpper === "CASH") mappedPaymentType = "CASH";
        else if (methodUpper === "GCASH" || methodUpper === "QR" || methodUpper === "E_PAYMENT") mappedPaymentType = "E_PAYMENT";
        else if (methodUpper === "LANDBANK" || methodUpper === "BANK_TRANSFER") mappedPaymentType = "BANK_TRANSFER";

        // Query all transactions in batch including Cedula relations
        const transactions = await prisma.transaction.findMany({
            where: { id: { in: allTxIds } },
            include: { type: true, user: true, cedula: true }
        });

        if (transactions.length !== allTxIds.length) {
            return { success: false, error: "One or more selected transactions could not be found." };
        }

        // Validate that no transactions are already paid, cancelled, or unpayable
        for (const tx of transactions) {
            if (tx.isPaid && tx.status === "PAID" && tx.id !== primaryId) {
                return { success: false, error: `Transaction ${tx.id} (${tx.type?.name}) is already marked as PAID.` };
            }

            const add = (tx.additionalData as any) || {};
            const fee = Number(tx.totalAmount || add.calculatedTax?.totalAmount || add.totalTaxDue || add.realPropertyTax?.totalTaxDue || 0);

            // Sibling transactions MUST be evaluated and ready for payment
            if (tx.id !== primaryId) {
                const evalResult = evaluateTransactionPayability(tx);
                if (!evalResult.isPayable) {
                    return {
                        success: false,
                        error: `Cannot issue O.R. for ${tx.type?.name || "Transaction"}: ${evalResult.unpayableReason || "Not yet ready for payment collection"}.`
                    };
                }
            } else {
                // Primary transaction fee must be > 0 (or calculated from form)
                if (fee <= 0 && !add.calculatedTax?.totalAmount && !add.totalTaxDue) {
                    return {
                        success: false,
                        error: `Cannot issue O.R. for primary transaction: fee amount must be greater than zero.`
                    };
                }
            }
        }

        // Compute grand total
        const grandTotal = transactions.reduce((sum, tx) => {
            const add = (tx.additionalData as any) || {};
            const fee = Number(tx.totalAmount || add.calculatedTax?.totalAmount || add.totalTaxDue || add.realPropertyTax?.totalTaxDue || 0);
            return sum + fee;
        }, 0);
        const isMerged = allTxIds.length > 1;
        const sanitizedRemarks = remarks ? sanitizeString(remarks) : undefined;

        // Atomic transaction execution across all merged records
        await prisma.$transaction(async (txPrisma: any) => {
            for (const tx of transactions) {
                const currentAdd = (tx.additionalData as any) || {};
                const individualFee = Number(tx.totalAmount || currentAdd.calculatedTax?.totalAmount || currentAdd.totalTaxDue || currentAdd.realPropertyTax?.totalTaxDue || 0);
                const code = (tx.type?.code || "").toUpperCase();
                const cat = (tx.type?.category || "").toUpperCase();
                const isCedulaTx = code.includes("CEDULA") || cat === "CEDULA";
                const isRptTx = cat === "RPT" || code.startsWith("RPT");
                const isBusinessPermitTx = code.startsWith("BUSINESS_PERMIT") || cat.includes("BUSINESS") || code.includes("BUSINESS");
                const isPosoTx = code === "POSO_TRAFFIC_FINE" || code.startsWith("POSO") || cat === "POSO";
                const effectiveCtc = isCedulaTx ? (ctcNumber || currentAdd.ctcNumber || "") : "";

                let targetStatus: any = "PAID";
                if (isRptTx) {
                    targetStatus = "RELEASED";
                } else if (isBusinessPermitTx) {
                    targetStatus = "FOR_CLAIM";
                }

                const updatedAdd = {
                    ...currentAdd,
                    orSeriesNumber,
                    isMergedPayment: isMerged,
                    mergedGroupOr: orSeriesNumber,
                    mergedParentTxId: primaryId,
                    mergedSiblingTxIds: allTxIds,
                    mergedGrandTotal: grandTotal,
                    individualFeeAmount: individualFee,
                    mergedAt: new Date().toISOString(),
                    releasedBy: user.name || user.email || "Treasury Staff",
                    ...(isRptTx && { treasuryStatus: "COMPLETED", releasedAt: new Date().toISOString() }),
                    ...(isBusinessPermitTx && { releasedAt: new Date().toISOString() }),
                    ...(effectiveCtc && { ctcNumber: effectiveCtc }),
                    ...(sanitizedRemarks && { treasuryRemarks: sanitizedRemarks }),
                    ...(orDocumentUrl && { orDocumentUrl, orUrl: orDocumentUrl }),
                    ...(treasuryReceiptUrl && { treasuryReceiptUrl })
                };

                const paymentRef = mappedPaymentType === "CASH"
                    ? null
                    : (paymentReferenceInput
                        ? sanitizeString(paymentReferenceInput)
                        : (currentAdd.gcashReferenceNo || currentAdd.referenceNo || tx.paymentReference || `manual_${tx.id}`));

                // Update Transaction record
                await txPrisma.transaction.update({
                    where: { id: tx.id },
                    data: {
                        status: targetStatus,
                        isPaid: true,
                        totalAmount: individualFee,
                        paymentType: mappedPaymentType,
                        paymentReference: paymentRef,
                        ...(orDocumentUrl && { orUrl: orDocumentUrl }),
                        updatedAt: new Date(),
                        additionalData: updatedAdd
                    }
                });

                // POSO tickets update
                if (isPosoTx) {
                    let ticketHeaderIds: string[] = Array.isArray(currentAdd.ticketHeaderIds)
                        ? currentAdd.ticketHeaderIds
                        : currentAdd.ticketHeaderId
                        ? [currentAdd.ticketHeaderId]
                        : [];
                    if (ticketHeaderIds.length === 0 && Array.isArray(currentAdd.ticketsBreakdown)) {
                        ticketHeaderIds = currentAdd.ticketsBreakdown.map((tb: any) => tb.ticketId).filter(Boolean);
                    }
                    const ticketOrConditions: any[] = [{ transactionId: tx.id }];
                    if (ticketHeaderIds.length > 0) {
                        ticketOrConditions.push({ id: { in: ticketHeaderIds } });
                    }
                    if (currentAdd.ticketNo) {
                        ticketOrConditions.push({ ticketNo: currentAdd.ticketNo });
                    }
                    if (Array.isArray(currentAdd.ticketNumbers) && currentAdd.ticketNumbers.length > 0) {
                        ticketOrConditions.push({ ticketNo: { in: currentAdd.ticketNumbers } });
                    }

                    await txPrisma.ticketHeader.updateMany({
                        where: { OR: ticketOrConditions },
                        data: {
                            status: "PAID",
                            isPaid: true,
                            transactionId: tx.id
                        }
                    });
                }

                // RPT model update
                if (isRptTx) {
                    await txPrisma.realPropertyTax.updateMany({
                        where: { transactionId: tx.id },
                        data: { treasuryStatus: "COMPLETED" }
                    });
                }

                // Upsert Cedula record if Cedula transaction
                if (isCedulaTx && effectiveCtc) {
                    const now = new Date();
                    if (!tx.cedula) {
                        await txPrisma.cedula.create({
                            data: {
                                transactionId: tx.id,
                                ctcNumber: effectiveCtc,
                                taxYear: now.getFullYear(),
                                dateIssued: now,
                                expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                                basicTax: Number(currentAdd.calculatedTax?.basicTax || 5),
                                additionalTax: Number(currentAdd.calculatedTax?.additionalTax || 0),
                                penalty: Number(currentAdd.calculatedTax?.penalty || 0),
                                totalPaid: individualFee,
                                issuedBy: user.name || "Treasury Staff",
                                businessName: tx.businessName || currentAdd.businessName || null,
                                documentUrl: tx.eCopyUrl || null,
                                verificationId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                            }
                        });
                    } else {
                        await txPrisma.cedula.update({
                            where: { id: tx.cedula.id },
                            data: {
                                ctcNumber: effectiveCtc,
                                totalPaid: individualFee
                            }
                        });
                    }
                }

                // Upsert Payment record (retaining individual fee for Form 129A accounting columns)
                await txPrisma.payment.upsert({
                    where: { transactionId: tx.id },
                    update: {
                        amount: individualFee,
                        method: mappedPaymentType,
                        status: "PAID",
                        reference: paymentRef ? String(paymentRef) : null,
                        orNumber: orSeriesNumber,
                        meta: {
                            source: "treasury_merged_confirmation",
                            isMerged,
                            mergedCount: allTxIds.length,
                            groupOr: orSeriesNumber,
                            grandTotal,
                            individualFee,
                            releasedBy: user.name || user.email || "Treasury Staff",
                            ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                            ...(orDocumentUrl && { orDocumentUrl })
                        }
                    },
                    create: {
                        transactionId: tx.id,
                        amount: individualFee,
                        method: mappedPaymentType,
                        status: "PAID",
                        reference: paymentRef ? String(paymentRef) : null,
                        orNumber: orSeriesNumber,
                        meta: {
                            source: "treasury_merged_confirmation",
                            isMerged,
                            mergedCount: allTxIds.length,
                            groupOr: orSeriesNumber,
                            grandTotal,
                            individualFee,
                            releasedBy: user.name || user.email || "Treasury Staff",
                            ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                            ...(orDocumentUrl && { orDocumentUrl })
                        }
                    }
                });
            }
        });

        // Send confirmation emails asynchronously
        for (const tx of transactions) {
            if (tx.user?.email) {
                const resident = (tx.residentSnapshot as any) || {};
                const name = resident.firstName ? `${resident.firstName} ${resident.lastName}` : (tx.user.name || "Resident");
                try {
                    await sendEmail({
                        type: "PAID",
                        to: tx.user.email,
                        name,
                        transactionId: tx.id,
                        serviceName: tx.type?.name || "Municipal Service",
                        amount: Number(tx.totalAmount || 0),
                        remarks: `Official Receipt Series No: ${orSeriesNumber}`,
                        department: "TREASURY"
                    });
                } catch (emailErr) {
                    console.warn(`Could not dispatch payment email to ${tx.user.email}:`, emailErr);
                }
            }
        }

        // Revalidate UI paths
        revalidatePath("/admin/treasury");
        revalidatePath(`/admin/treasury/${primaryId}`);
        revalidatePath("/admin/treasury/payments");
        revalidatePath("/admin/treasury/queue");
        revalidatePath("/admin/treasury?category=RPT");
        revalidatePath("/admin/treasury?category=POSO");
        revalidatePath("/admin/treasury?category=BUSINESS_PERMIT");
        revalidatePath("/admin/treasury?category=Civil%20Registry");
        revalidatePath("/admin/assessor");
        revalidatePath("/admin/poso");
        revalidatePath("/admin/bplo");

        return {
            success: true,
            mergedCount: allTxIds.length,
            grandTotal,
            orNumber: orSeriesNumber,
            allTxIds
        };
    } catch (error: any) {
        console.error("Failed to process merged treasury payment:", error);
        return {
            success: false,
            error: error.message || "Failed to process merged treasury payment."
        };
    }
}

