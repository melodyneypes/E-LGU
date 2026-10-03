"use server";

import prisma from "@/lib/db/prisma";
import { getPosoPenaltySettings, calculatePosoTicketPenalty, POSOPenaltyBreakdown } from "@/app/admin/poso/actions";
import lguConfig from "@/config/lgu.config.json";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export async function getPosoPortalSettings() {
    return {
        siteLogo: lguConfig.assets.logo,
        posoLocation: lguConfig.poso.address,
        posoHotline: lguConfig.poso.hotline,
        posoEmail: lguConfig.poso.email,
        posoHours: lguConfig.poso.officeHours,
        posoFacebook: lguConfig.social.posoFacebook,
    };
}

export async function getAllTrafficViolations() {
    try {
        const violations = await (prisma as any).trafficViolation.findMany({
            where: { isActive: true },
            orderBy: { violationName: "asc" },
        });

        return { success: true, violations: JSON.parse(JSON.stringify(violations)) };
    } catch (error: any) {
        console.error("Failed to fetch traffic violations:", error);
        return { success: false, violations: [] };
    }
}

export async function getTrafficViolationById(id: string) {
    try {
        const violation = await (prisma as any).trafficViolation.findUnique({
            where: { id },
        });

        if (!violation) {
            return { success: false, error: "Traffic Violation Ordinance record not found." };
        }

        return { success: true, violation: JSON.parse(JSON.stringify(violation)) };
    } catch (error: any) {
        console.error("Failed to fetch traffic violation by ID:", error);
        return { success: false, error: error.message || "Failed to load traffic violation record." };
    }
}

export async function searchPublicTicket(query: string) {
    try {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return { success: false, error: "Please enter a valid Citation Ticket Number." };
        }

        // IP-based Rate Limiting to prevent automated scraping (5 lookups per minute per IP)
        const clientIp = await getClientIp();
        const rateLimitKey = `poso_ticket_search:${clientIp}`;
        const limitCheck = await isRateLimited(rateLimitKey, 5, 60 * 1000);

        if (!limitCheck.success) {
            return {
                success: false,
                error: "Too many ticket search requests. Please wait a minute before searching again."
            };
        }

        // Search strictly by ticketNo only
        const ticket = await (prisma as any).ticketHeader.findFirst({
            where: {
                ticketNo: { equals: cleanQuery, mode: "insensitive" },
            },
            include: {
                details: {
                    include: {
                        violation: true,
                    },
                },
                ticketPhotos: true,
            },
            orderBy: { createdAt: "desc" },
        });

        if (!ticket) {
            return { success: false, error: `No POSO Citation Ticket found for "${cleanQuery}". Please check the ticket number and try again.` };
        }

        // Fetch optional transaction safely if transactionId is present
        if (ticket.transactionId) {
            try {
                const tx = await (prisma as any).transaction.findUnique({
                    where: { id: ticket.transactionId },
                    include: { payment: true },
                });
                if (tx) {
                    ticket.transaction = tx;
                }
            } catch { /* silent fallback if transactionId is dangling */ }
        }

        // Fetch POSO penalty settings and calculate overdue penalty breakdown
        const settingsRes = await getPosoPenaltySettings();
        const settings = settingsRes.settings || { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 };
        const penaltyBreakdown: POSOPenaltyBreakdown = await calculatePosoTicketPenalty(ticket, settings);

        return {
            success: true,
            ticket: JSON.parse(JSON.stringify(ticket)),
            penaltyBreakdown: JSON.parse(JSON.stringify(penaltyBreakdown)),
            settings,
        };
    } catch (error: any) {
        console.error("Public POSO Ticket Search Error:", error);
        return { success: false, error: error.message || "An unexpected error occurred while looking up ticket details." };
    }
}

/**
 * Guarantees that a POSO TicketHeader is linked to a valid Transaction model in Prisma.
 * If missing, creates a POSO Transaction record automatically.
 */
export async function ensureTicketTransaction(ticketId: string) {
    try {
        const ticket = await (prisma as any).ticketHeader.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        if (ticket.transactionId) {
            const existingTx = await (prisma as any).transaction.findUnique({
                where: { id: ticket.transactionId },
            });
            if (existingTx) {
                return { success: true, transactionId: existingTx.id };
            }
        }

        // Find or create POSO Citation Fine TransactionType
        let txType = await (prisma as any).transactionType.findFirst({
            where: { category: "POSO" },
        });

        if (!txType) {
            txType = await (prisma as any).transactionType.findFirst();
        }

        const newTx = await (prisma as any).transaction.create({
            data: {
                typeId: txType.id,
                status: "PENDING",
                totalAmount: ticket.totalAmount || 0,
                paymentType: "E_PAYMENT",
                residentSnapshot: {
                    violatorName: ticket.violatorName,
                    licenseNo: ticket.licenseNo,
                    plateNo: ticket.plateNo,
                    ticketNo: ticket.ticketNo,
                },
                additionalData: {
                    posoTicketId: ticket.id,
                    ticketNo: ticket.ticketNo,
                },
            },
        });

        // Link back to ticketHeader
        await (prisma as any).ticketHeader.update({
            where: { id: ticket.id },
            data: { transactionId: newTx.id },
        });

        return { success: true, transactionId: newTx.id };
    } catch (error: any) {
        console.error("ensureTicketTransaction error:", error);
        return { success: false, error: error.message || "Failed to link transaction." };
    }
}

/**
 * Instant client-side sync fallback when returning from PayMongo redirect (success=true)
 */
export async function verifyAndSyncTicketPayment(ticketNo: string) {
    try {
        const ticket = await (prisma as any).ticketHeader.findFirst({
            where: { ticketNo: { equals: ticketNo, mode: "insensitive" } },
            include: { transaction: true },
        });

        if (!ticket) return { success: false, error: "Ticket not found" };

        if (!ticket.isPaid) {
            // Calculate dynamic penalty breakdown (Base + 25% Surcharge + Accrued Monthly Interest)
            let actualPaidTotal = (Number(ticket.totalAmount || 0)) + (Number(ticket.impoundFee || 0));
            let penaltyBreakdownSnapshot: any = null;
            let fiscalSnapshotData: any = null;

            try {
                const { getPosoPenaltySettings, calculatePosoTicketPenalty } = await import("@/app/admin/poso/actions");
                const settingsRes = await getPosoPenaltySettings();
                if (settingsRes?.settings) {
                    const breakdown = await calculatePosoTicketPenalty(ticket, settingsRes.settings);
                    actualPaidTotal = breakdown.grandTotalPayable;
                    penaltyBreakdownSnapshot = {
                        baseFine: breakdown.baseFine,
                        impoundFee: breakdown.impoundFee,
                        subtotal: breakdown.subtotal,
                        isOverdue: breakdown.isOverdue,
                        daysOverdue: breakdown.daysOverdue,
                        monthsOverdue: breakdown.monthsOverdue,
                        surchargeRate: breakdown.surchargeRate,
                        surchargeAmount: breakdown.surchargeAmount,
                        monthlyInterestRate: breakdown.monthlyInterestRate,
                        interestAmount: breakdown.interestAmount,
                        totalPenalty: breakdown.totalPenalty,
                        grandTotalPayable: breakdown.grandTotalPayable,
                        paidAt: new Date().toISOString()
                    };

                    fiscalSnapshotData = {
                        baseFineTotal: breakdown.subtotal,
                        impoundFee: breakdown.impoundFee,
                        surchargeAmount: breakdown.surchargeAmount,
                        interestAmount: breakdown.interestAmount,
                        totalAmount: breakdown.grandTotalPayable
                    };
                }
            } catch (calcErr) {
                console.warn("verifyAndSyncTicketPayment: error calculating penalty breakdown", calcErr);
            }

            // Update TicketHeader status and totalAmount strictly to PAID & actual paid amount
            await (prisma as any).ticketHeader.update({
                where: { id: ticket.id },
                data: {
                    status: "PAID",
                    isPaid: true,
                    totalAmount: actualPaidTotal,
                    updatedAt: new Date(),
                },
            });

            // Update Transaction if present
            if (ticket.transactionId) {
                let actualPaymentId = ticket.transaction?.additionalData?.paymongo?.paymentId || ticket.transaction?.paymentReference;

                // If reference is still checkoutSessionId (cs_...) or fallback, query PayMongo Checkout Session API to retrieve real pay_... Payment ID
                const csId = ticket.transaction?.additionalData?.paymongo?.checkoutSessionId;
                if ((!actualPaymentId || !actualPaymentId.startsWith("pay_")) && csId && process.env.PAYMONGO_SECRET_KEY) {
                    try {
                        const secretKeyBase64 = Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64");
                        const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${csId}`, {
                            headers: {
                                Authorization: `Basic ${secretKeyBase64}`,
                                Accept: "application/json",
                            },
                        });

                        if (pmRes.ok) {
                            const pmData = await pmRes.json();
                            const paymentsArr = pmData?.data?.attributes?.payments;
                            if (Array.isArray(paymentsArr) && paymentsArr.length > 0) {
                                const realPayId = paymentsArr[0]?.id;
                                if (realPayId) {
                                    actualPaymentId = realPayId;
                                }
                            }
                        }
                    } catch (pmErr) {
                        console.warn("Could not query PayMongo API for payment ID:", pmErr);
                    }
                }

                const paymongoRef = (actualPaymentId && actualPaymentId.startsWith("pay_")) 
                    ? actualPaymentId 
                    : (ticket.transaction?.additionalData?.paymongo?.paymentId || ticket.transaction?.paymentReference || `cs_live_${ticket.ticketNo}`);

                const currentAdditional = (ticket.transaction?.additionalData as any) || {};
                const updatedAdditional = {
                    ...currentAdditional,
                    ...(penaltyBreakdownSnapshot ? { penaltyBreakdown: penaltyBreakdownSnapshot } : {})
                };

                await (prisma as any).transaction.update({
                    where: { id: ticket.transactionId },
                    data: {
                        status: "PAID",
                        isPaid: true,
                        totalAmount: actualPaidTotal,
                        paymentType: "E_PAYMENT",
                        paymentReference: paymongoRef,
                        additionalData: updatedAdditional,
                        ...(fiscalSnapshotData ? { fiscalSnapshot: fiscalSnapshotData } : {}),
                        updatedAt: new Date(),
                    },
                });

                await (prisma as any).payment.upsert({
                    where: { transactionId: ticket.transactionId },
                    update: {
                        amount: actualPaidTotal,
                        method: "E_PAYMENT",
                        status: "PAID",
                        reference: paymongoRef,
                    },
                    create: {
                        transactionId: ticket.transactionId,
                        amount: actualPaidTotal,
                        method: "E_PAYMENT",
                        status: "PAID",
                        reference: paymongoRef,
                    },
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("verifyAndSyncTicketPayment error:", error);
        return { success: false, error: error.message };
    }
}
