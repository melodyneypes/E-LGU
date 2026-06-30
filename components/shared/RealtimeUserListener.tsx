"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function RealtimeUserListener() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!supabase || status !== "authenticated" || !session?.user?.id) return;

        const userId = session.user.id;
        console.log(`Subscribing to Supabase Realtime updates for user: ${userId}`);

        // 1. Listen to updates on the User record (for account state changes)
        const userChannel = supabase
            .channel(`realtime-user-profile-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "User",
                    filter: `id=eq.${userId}`
                },
                (payload: any) => {
                    console.log("User profile updated in realtime:", payload.new);
                    const updatedUser = payload.new;
                    const rejectionCount = updatedUser ? (updatedUser.rejectionCount ?? updatedUser.rejectioncount ?? 0) : 0;
                    if (rejectionCount >= 3) {
                        if (typeof window !== "undefined") {
                            sessionStorage.setItem("account_locked_toast", "true");
                        }
                        signOut({ callbackUrl: "/auth/login" });
                        return;
                    }
                    // Refresh NextJS server components state
                    router.refresh();
                }
            )
            .subscribe();

        // 2. Listen to updates on the user's transactions (for status changes, approvals, rejections)
        const txChannel = supabase
            .channel(`realtime-user-transactions-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "Transaction",
                    filter: `userId=eq.${userId}`
                },
                (payload: any) => {
                    const updatedTx = payload.new;
                    console.log("Transaction updated in realtime:", updatedTx);

                    const title = updatedTx.controlNumber || "document request";

                    if (updatedTx.status === "UNPAID") {
                        toast.success(`Your request (${title}) has been approved! Proceed to payment page.`, {
                            duration: 6000
                        });
                    } else if (updatedTx.status === "REJECTED") {
                        toast.error(`Your request (${title}) was rejected. Please check comments.`, {
                            duration: 8000
                        });
                    } else if (updatedTx.status === "RELEASED") {
                        toast.success(`Congratulations! Your document (${title}) has been processed & released.`, {
                            duration: 8000
                        });
                    }

                    // Pull fresh data to the UI
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            console.log(`Cleaning up Supabase Realtime channels for user: ${userId}`);
            supabase.removeChannel(userChannel);
            supabase.removeChannel(txChannel);
        };
    }, [session, status, router]);

    return null;
}
