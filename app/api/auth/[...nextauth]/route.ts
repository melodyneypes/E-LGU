import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function customHandler(req: NextRequest, context: any): Promise<Response> {
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    process.env.NEXTAUTH_URL = `${protocol}://${host}`;

    const resolvedParams = await context.params;
    const handler = NextAuth(authOptions);
    const res = await handler(req, { ...context, params: resolvedParams });
    
    // Check if this is a signout request
    if (req.nextUrl.pathname.endsWith("/signout")) {
        // Clear all possible session, csrf, and callback cookies for both secure and non-secure environments
        const cookieNames = [
            "next-auth.session-token",
            "__Secure-next-auth.session-token",
            "next-auth.callback-url",
            "__Secure-next-auth.callback-url",
            "next-auth.csrf-token",
            "__Secure-next-auth.csrf-token"
        ];
        
        cookieNames.forEach((name) => {
            const isSecure = name.startsWith("__Secure-");
            res.headers.append(
                "Set-Cookie",
                `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? "; Secure" : ""}`
            );
        });
        
        // Also clear active_portal cookie
        res.headers.append(
            "Set-Cookie",
            "active_portal=; Path=/; Max-Age=0; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        );
    }
    
    return res;
}

export { customHandler as GET, customHandler as POST };
