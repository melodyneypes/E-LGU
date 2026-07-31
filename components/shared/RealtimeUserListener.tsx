"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { logoutToLogin } from "@/components/auth/logout-to-login";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function RealtimeUserListener() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const notifiedTxRef = useRef<Set<string>>(new Set());

    const userId = session?.user?.id;

    useEffect(() => {
        if (!supabase || status !== "authenticated" || !userId) return;

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
                        logoutToLogin();
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

                    if (!updatedTx || !updatedTx.id) return;

                    const toastKey = `${updatedTx.id}-${updatedTx.status}`;
                    if (notifiedTxRef.current.has(toastKey)) {
                        return; // Prevent duplicate toast executions completely
                    }
                    notifiedTxRef.current.add(toastKey);

                    const title = updatedTx.controlNumber || "document request";

                    if (updatedTx.status === "UNPAID") {
                        toast.success(`Your request (${title}) has been approved! Proceed to payment page.`, {
                            id: `realtime-unpaid-${updatedTx.id}`,
                            duration: 6000
                        });
                    } else if (updatedTx.status === "REJECTED") {
                        const remarks = updatedTx.rejectionRemarks ?? updatedTx.rejectionremarks ?? "";
                        if (remarks === "Appointment slot expired / missed") {
                            return;
                        }
                        toast.error(`Your request (${title}) was rejected. Please check comments.`, {
                            id: `realtime-rejected-${updatedTx.id}`,
                            duration: 8000
                        });
                    } else if (updatedTx.status === "RELEASED") {
                        toast.success(`Congratulations! Your document (${title}) has been processed & released.`, {
                            id: `realtime-released-${updatedTx.id}`,
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
    }, [userId, status, router]);

    return null;
}
