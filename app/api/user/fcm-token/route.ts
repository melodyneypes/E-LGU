import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Strict Authentication Guard: Require active user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized access. Valid user session required." }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken } = body;

    if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
      return NextResponse.json({ success: false, error: "Valid fcmToken string is required" }, { status: 400 });
    }

    // 2. Safe Update: Bind strictly to the authenticated caller's user ID
    const user = await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: fcmToken.trim() },
      select: { id: true, fcmToken: true }
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("[FCM Token API Error]:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to update FCM Token" }, { status: 500 });
  }
}
