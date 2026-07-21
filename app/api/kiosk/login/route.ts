import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
    console.log("[DEBUG KIOSK LOGIN] Request received at /api/kiosk/login");
    try {
        const body = await request.json();
        const { email, password } = body;
        console.log("[DEBUG KIOSK LOGIN] Parsed body for email:", email);

        if (!email || !password) {
            console.log("[DEBUG KIOSK LOGIN] Missing email or password");
            return NextResponse.json(
                { success: false, error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find the user in the database
        console.log("[DEBUG KIOSK LOGIN] Querying database for user...");
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        console.log("[DEBUG KIOSK LOGIN] Database query finished. User found:", !!user);

        if (!user || !user.password) {
            console.log("[DEBUG KIOSK LOGIN] User not found or password empty");
            return NextResponse.json(
                { success: false, error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify password
        console.log("[DEBUG KIOSK LOGIN] Verifying password with bcrypt...");
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        console.log("[DEBUG KIOSK LOGIN] Password verification result:", isPasswordCorrect);
        
        if (!isPasswordCorrect) {
            console.log("[DEBUG KIOSK LOGIN] Password incorrect");
            return NextResponse.json(
                { success: false, error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify role and department (must be ADMIN and department FRONTDESK)
        const isFrontDesk = user.role === "ADMIN" && user.department?.toUpperCase() === "FRONTDESK";
        console.log("[DEBUG KIOSK LOGIN] Authorization check - Role:", user.role, "Department:", user.department, "isFrontDesk:", isFrontDesk);
        
        if (!isFrontDesk) {
            console.log("[DEBUG KIOSK LOGIN] Access denied (not FRONTDESK admin)");
            return NextResponse.json(
                { success: false, error: "Access Denied: Only FRONTDESK admins are authorized" },
                { status: 403 }
            );
        }

        // Generate a lightweight base64 token containing the user details with cryptographic signature
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            department: user.department,
            timestamp: Date.now()
        };
        const secret = process.env.NEXTAUTH_SECRET || "emapandan-fallback-kiosk-secret";
        const signature = crypto.createHmac("sha256", secret)
            .update(JSON.stringify(tokenPayload))
            .digest("hex");
        const token = Buffer.from(JSON.stringify({ payload: tokenPayload, signature })).toString("base64");
        console.log("[DEBUG KIOSK LOGIN] Signed token generated successfully");

        const responseObj = {
            success: true,
            token,
            user: {
                name: user.name || "Front Desk Staff",
                email: user.email,
                role: user.role,
                department: user.department
            }
        };
        console.log("[DEBUG KIOSK LOGIN] Returning 200 OK response");
        return NextResponse.json(responseObj);
    } catch (error) {
        console.error("[DEBUG KIOSK LOGIN] CRITICAL ERROR occurred:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
