"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { FeedbackRating } from "@prisma/client";

interface SubmitFeedbackInput {
    transactionId: string;
    rating: FeedbackRating;
    comment?: string;
}

/**
 * Maps transaction category or processor role to a municipal department code
 */
function resolveDepartment(type: any): string {
    if (!type) return "GENERAL";
    const category = (type.category || "").toUpperCase();
    const role = (type.processorRole || "").toUpperCase();
    const code = (type.code || "").toUpperCase();

    if (category.includes("RHU") || category.includes("HEALTH") || code.startsWith("RHU_")) {
        return "RHU";
    }
    if (category.includes("ENGINEER") || role.includes("ENGINEER") || code.startsWith("ENG_")) {
        return "ENGINEERING";
    }
    if (category.includes("CIVIL") || category.includes("LCR") || role.includes("MCR") || code.startsWith("LCR_")) {
        return "CIVIL_REGISTRAR";
    }
    if (category.includes("BPLO") || category.includes("BUSINESS") || role.includes("BPLO") || code.startsWith("BPLO_")) {
        return "BPLO";
    }
    if (category.includes("ASSESSOR") || role.includes("ASSESSOR") || code.startsWith("ASSESSOR_")) {
        return "ASSESSOR";
    }
    if (category.includes("TREASURY") || role.includes("TREASURY") || code.startsWith("TREASURY_") || code === "CEDULA") {
        return "TREASURY";
    }
    return "GENERAL";
}

/**
 * Submit feedback for a released/completed transaction
 */
export async function submitTransactionFeedbackAction(input: SubmitFeedbackInput) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Please log in to submit your feedback." };
        }

        const { transactionId, rating, comment } = input;

        if (!transactionId) {
            return { success: false, error: "Transaction identifier is required." };
        }

        if (!rating || !["ONE", "TWO", "THREE", "FOUR", "FIVE"].includes(rating)) {
            return { success: false, error: "Please select a valid rating from 1 to 5 stars." };
        }

        // Validate transaction exists and belongs to the user
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                type: true,
                feedback: true
            }
        });

        if (!transaction) {
            return { success: false, error: "Transaction record not found." };
        }

        if (transaction.userId !== session.user.id && session.user.role !== "ADMIN") {
            return { success: false, error: "Forbidden: You can only submit feedback for your own transactions." };
        }

        // Check if feedback already submitted
        if (transaction.feedback) {
            return { 
                success: false, 
                error: "Feedback has already been submitted for this transaction. Thank you!" 
            };
        }

        // Check completion status (must be RELEASED, DELIVERED, or RHU COMPLETED)
        const isCompleted = ["RELEASED", "DELIVERED", "COMPLETED"].includes(transaction.status) || 
            (transaction.additionalData as any)?.rhuStatus === "COMPLETED";

        if (!isCompleted) {
            return {
                success: false,
                error: "Feedback can only be submitted once the transaction has been completed and released."
            };
        }

        const department = resolveDepartment(transaction.type);

        const newFeedback = await prisma.transactionFeedback.create({
            data: {
                transactionId,
                transactionTypeId: transaction.typeId || null,
                userId: session.user.id,
                rating,
                comment: comment?.trim() ? comment.trim().slice(0, 1000) : null,
                department
            }
        });

        revalidatePath(`/user/appointment/${transactionId}`);
        revalidatePath(`/user/appointment`);
        revalidatePath(`/user/services/requests/${transactionId}`);

        return {
            success: true,
            data: newFeedback,
            message: "Thank you! Your feedback has been successfully submitted."
        };
    } catch (error: any) {
        console.error("[submitTransactionFeedbackAction] Error:", error);
        return {
            success: false,
            error: error.message || "Failed to record feedback. Please try again."
        };
    }
}
