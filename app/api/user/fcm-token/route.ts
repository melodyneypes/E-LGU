import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { fcmToken, userId, email } = body;

    if (!fcmToken) {
      return NextResponse.json({ success: false, error: "fcmToken is required" }, { status: 400 });
    }

    const targetUserId = session?.user?.id || userId;
    const targetEmail = session?.user?.email || email;

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ success: false, error: "User identity required" }, { status: 401 });
    }

    let user;
    if (targetUserId) {
      user = await prisma.user.update({
        where: { id: targetUserId },
        data: { fcmToken },
      });
    } else if (targetEmail) {
      user = await prisma.user.update({
        where: { email: targetEmail },
        data: { fcmToken },
      });
    }

    return NextResponse.json({ success: true, user: { id: user?.id, fcmToken: user?.fcmToken } });
  } catch (error: any) {
    console.error("[FCM Token API Error]:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to update FCM Token" }, { status: 500 });
  }
}
