"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitReviewAction(
    targetId: string,
    targetType: "accommodation" | "dining",
    rating: number,
    comment?: string,
    mediaUrl?: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return { success: false, error: "You must be logged in to submit a review." };
        }

        if (rating < 1 || rating > 5) {
            return { success: false, error: "Rating must be between 1 and 5." };
        }

        if (comment && comment.length > 500) {
            return { success: false, error: "Your review exceeds the maximum limit of 500 characters." };
        }

        // Find user in database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return { success: false, error: "User profile not found in database." };
        }

        // Check if the user already has a review for this target (Strict One-Time constraint)
        const existingReview = await prisma.review.findFirst({
            where: {
                userId: user.id,
                accommodationId: targetType === "accommodation" ? targetId : undefined,
                diningId: targetType === "dining" ? targetId : undefined,
            }
        });

        if (existingReview) {
            return { success: false, error: "You have already submitted a review for this place. Only one review is allowed per user." };
        }

        // Create review
        await prisma.review.create({
            data: {
                rating,
                comment: comment || null,
                mediaUrl: mediaUrl || null,
                userId: user.id,
                accommodationId: targetType === "accommodation" ? targetId : null,
                diningId: targetType === "dining" ? targetId : null,
            }
        });

        // Revalidate cache to show the updated reviews
        revalidatePath(`/user/${targetType}/${targetId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error in submitReviewAction:", error);
        return { 
            success: false, 
            error: error instanceof Error 
                ? `Database Error: ${error.message}` 
                : "An unexpected error occurred while saving your review." 
        };
    }
}

