import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        // 1. Authenticate Kiosk Token
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Missing authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        let userId: string;
        try {
            const decoded = JSON.parse(Buffer.from(token, "base64").toString("ascii"));
            const { payload, signature } = decoded;
            
            if (!payload || !signature) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized: Invalid authorization token format" },
                    { status: 401 }
                );
            }

            const secret = process.env.NEXTAUTH_SECRET || "emapandan-fallback-kiosk-secret";
            const expectedSignature = crypto.createHmac("sha256", secret)
                .update(JSON.stringify(payload))
                .digest("hex");

            if (signature !== expectedSignature) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized: Token signature mismatch" },
                    { status: 401 }
                );
            }

            userId = payload.userId;
        } catch {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Invalid authorization token" },
                { status: 401 }
            );
        }

        const staff = await prisma.user.findUnique({
            where: { id: userId }
        });

        const isFrontDesk = staff?.role === "ADMIN" && staff.department?.toUpperCase() === "FRONTDESK";
        if (!isFrontDesk) {
            return NextResponse.json(
                { success: false, error: "Forbidden: Only Front Desk staff can perform check-ins" },
                { status: 403 }
            );
        }

        // 2. Validate Transaction & Appointment Date
        const { transactionId } = await request.json();
        if (!transactionId) {
            return NextResponse.json(
                { success: false, error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        let transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { type: true }
        });

        // Fallback: If not found by ID CUID, search by queueNumber or ticketNo
        if (!transaction) {
            const txs = await prisma.transaction.findMany({
                where: {
                    OR: [
                        { queueNumber: transactionId },
                        {
                            additionalData: {
                                path: ["ticketNo"],
                                equals: transactionId
                            }
                        }
                    ]
                },
                include: { type: true },
                orderBy: { createdAt: "desc" }
            });
            if (txs.length > 0) {
                // Prioritize active (non-cancelled, non-rejected) transactions first
                const activeTxs = txs.filter(t => !t.isCancelled && t.status !== "REJECTED");
                const candidatePool = activeTxs.length > 0 ? activeTxs : txs;

                // Find the first transaction that is NOT yet checked in for its current status
                transaction = candidatePool.find(t => {
                    const ad = (t.additionalData as any) || {};
                    return ad.checkedIn !== true || ad.lastCheckedInStatus !== t.status;
                }) || candidatePool[0];
            }
        }

        if (!transaction) {
            return NextResponse.json(
                { success: false, error: `Transaction ticket not found for code: ${transactionId}` },
                { status: 404 }
            );
        }

        if (transaction.isCancelled) {
            return NextResponse.json(
                { success: false, error: "Scan Failed: This appointment has been cancelled." },
                { status: 400 }
            );
        }

        if (transaction.status === "REJECTED") {
            return NextResponse.json(
                { success: false, error: "Scan Failed: This appointment has been rejected/declined." },
                { status: 400 }
            );
        }

        const isPosoTransaction = transaction.type?.category === "POSO" || transaction.type?.code === "POSO_TRAFFIC_FINE";
        const isPaymentOrClaiming = isPosoTransaction || ["PAID", "FOR_CLAIM"].includes(transaction.status);
        const today = new Date();

        if (!transaction.appointmentDate && !isPaymentOrClaiming) {
            return NextResponse.json(
                { success: false, error: "Ticket does not have an assigned appointment date" },
                { status: 400 }
            );
        }

        if (!isPaymentOrClaiming) {
            // Compare dates in Philippine Time (UTC+8) to avoid timezone mismatch
            const PH_OFFSET = 8 * 60; // minutes
            const toPhDate = (d: Date) => {
                const phMs = d.getTime() + PH_OFFSET * 60 * 1000;
                return new Date(phMs);
            };

            const appDatePh = toPhDate(new Date(transaction.appointmentDate!));
            const todayPh = toPhDate(today);

            const isToday = appDatePh.getUTCFullYear() === todayPh.getUTCFullYear() &&
                            appDatePh.getUTCMonth() === todayPh.getUTCMonth() &&
                            appDatePh.getUTCDate() === todayPh.getUTCDate();

            if (!isToday) {
                const formattedDate = appDatePh.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "Asia/Manila"
                });
                return NextResponse.json(
                    { 
                        success: false, 
                        error: `Wrong Date! Your appointment is scheduled on ${formattedDate}. Please return on that exact date.` 
                    },
                    { status: 400 }
                );
            }
        }

        // 3. Mark as checked-in in additionalData metadata
        const currentAdditionalData = (transaction.additionalData as any) || {};
        if (currentAdditionalData.checkedIn === true && currentAdditionalData.lastCheckedInStatus === transaction.status) {
            const lastCheckIn = currentAdditionalData.checkedInAt ? new Date(currentAdditionalData.checkedInAt) : null;
            const checkedInToday = lastCheckIn &&
                lastCheckIn.getFullYear() === today.getFullYear() &&
                lastCheckIn.getMonth() === today.getMonth() &&
                lastCheckIn.getDate() === today.getDate();

            if (checkedInToday) {
                return NextResponse.json(
                    { success: false, error: "This ticket has already been checked in for this phase today!" },
                    { status: 400 }
                );
            }
        }

        let queueNumber = transaction.queueNumber;
        if (!queueNumber) {
            let category: "CEDULA" | "BUSINESS_PERMIT" | "CIVIL_REGISTRY" | undefined = undefined;
            const categoryStr = (transaction.type?.category || "").toUpperCase();
            const codeStr = (transaction.type?.code || "").toUpperCase();

            if (categoryStr === "CIVIL REGISTRY" || codeStr.includes("PSA_") || codeStr.includes("APPOINTMENT") || codeStr.startsWith("LCR_")) {
                category = "CIVIL_REGISTRY";
            }

            const { generateQueueNumber } = await import("@/lib/queue");
            queueNumber = await generateQueueNumber({
                source: "kiosk",
                isPriority: transaction.isPriority || false,
                appointmentDate: today,
                appointmentSlot: today.getHours() < 12 ? "AM" : "PM",
                category
            });
        }

        const updatedAdditionalData = {
            ...currentAdditionalData,
            checkedIn: true,
            checkedInAt: today.toISOString(),
            lastCheckedInStatus: transaction.status
        };

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                appointmentDate: isPaymentOrClaiming ? today : undefined, // Update appointmentDate to today for payment/claim queue fetching
                queueNumber: queueNumber,
                additionalData: updatedAdditionalData,
                updatedAt: today
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/treasury/queue");
        revalidatePath("/admin/treasury/payments");
        revalidatePath("/queue");

        return NextResponse.json({
            success: true,
            queueNumber: updated.queueNumber || "T-N/A",
            serviceName: transaction.type?.name || "Service Request"
        });
    } catch (error) {
        console.error("Kiosk check-in API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
