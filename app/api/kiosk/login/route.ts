import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find the user in the database
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user || !user.password) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify role and department (must be ADMIN and department FRONTDESK)
        const isFrontDesk = user.role === "ADMIN" && user.department?.toUpperCase() === "FRONTDESK";
        if (!isFrontDesk) {
            return NextResponse.json(
                { success: false, error: "Access Denied: Only FRONTDESK admins are authorized" },
                { status: 403 }
            );
        }

        // Generate a lightweight base64 token containing the user details
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            department: user.department,
            timestamp: Date.now()
        };
        const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

        return NextResponse.json({
            success: true,
            token,
            user: {
                name: user.name || "Front Desk Staff",
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error("Kiosk login API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
