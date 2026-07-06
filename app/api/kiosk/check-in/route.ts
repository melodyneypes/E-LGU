import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

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
            userId = decoded.userId;
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

        // Fallback: If not found by ID CUID, search by queueNumber
        if (!transaction) {
            transaction = await prisma.transaction.findFirst({
                where: { queueNumber: transactionId },
                include: { type: true }
            });
        }

        if (!transaction) {
            return NextResponse.json(
                { success: false, error: `Transaction ticket not found for code: ${transactionId}` },
                { status: 404 }
            );
        }

        if (!transaction.appointmentDate) {
            return NextResponse.json(
                { success: false, error: "Ticket does not have an assigned appointment date" },
                { status: 400 }
            );
        }

        // Strictly check if the appointment is for today (local server timezone)
        const appDate = new Date(transaction.appointmentDate);
        const today = new Date();

        const isToday = appDate.getFullYear() === today.getFullYear() &&
                        appDate.getMonth() === today.getMonth() &&
                        appDate.getDate() === today.getDate();

        if (!isToday) {
            const formattedDate = appDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Wrong Date! Your appointment is scheduled on ${formattedDate}. Please return on that exact date.` 
                },
                { status: 400 }
            );
        }

        // 3. Mark as checked-in in additionalData metadata
        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            checkedIn: true,
            checkedInAt: new Date().toISOString()
        };

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/treasury");
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
