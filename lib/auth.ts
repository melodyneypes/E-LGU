import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Please enter an email and password");
                }

                const ip = await getClientIp();
                const emailClean = credentials.email.trim().toLowerCase();
                const limitKey = `login:fail:${emailClean}:${ip}`;

                // 1. Peek if they are already locked out (Max 5 failed logins per 15 minutes)
                const existingLimit = await prisma.rateLimit.findUnique({
                    where: { key: limitKey }
                });
                const now = new Date();
                if (existingLimit && existingLimit.attempts >= 5 && existingLimit.expiresAt > now) {
                    const minutesLeft = Math.ceil((existingLimit.expiresAt.getTime() - now.getTime()) / 60000);
                    throw new Error(`Too many failed login attempts. Try again in ${minutesLeft} minute(s).`);
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { residentProfile: true }
                });

                if (!user || !user.password) {
                    throw new Error("No user found with this email");
                }

                if (user.residentProfile?.isDead) {
                    throw new Error("This user is deceased, you can't open this account.");
                }

                const isPasswordCorrect = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordCorrect) {
                    // Increment failed login attempt
                    await isRateLimited(limitKey, 5, 900000); // 15 mins window
                    throw new Error("Invalid password");
                }

                // Clean/Reset failed attempts upon successful login
                // Using deleteMany() instead of delete() — safe even if no record exists
                await prisma.rateLimit.deleteMany({ where: { key: limitKey } });

                // Block login if user is not verified (but allow ADMIN)
                if (user.role === "USER" && !user.isEmailVerified) {
                    if ((user as any).rejectionCount >= 3) {
                        throw new Error("Your account has been deactivated due to multiple rejected requests. Please visit the Municipal Treasury Office for identity verification and account restoration.");
                    }
                    throw new Error("Your account has not been approved yet. Please wait for an administrator to process your registration.");
                }

                 return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isPasswordChanged: user.isPasswordChanged,
                    managedBarangay: user.managedBarangay,
                    department: user.department,
                };
            },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allows absolute callback URLs (like window.location.origin) even if they differ from NEXTAUTH_URL
            return url
        },
        async jwt({ token, user }) {
            if (user) {

                token.role = (user as any).role;
                token.id = user.id;

                token.isPasswordChanged = (user as any).isPasswordChanged;

                token.managedBarangay = (user as any).managedBarangay;
                token.department = (user as any).department;
            }

            // Sync Database dynamically with Session to Auto-Logout rejected/pending/deceased users!
            if (token.id && token.role === "USER") {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        isEmailVerified: true,
                        rejectionCount: true,
                        residentProfile: {
                            select: { isDead: true }
                        }
                    }
                });

                // If user is deactivated OR has hit the rejection limit OR is deceased, expire the session
                if (!dbUser || !dbUser.isEmailVerified || (dbUser as any).rejectionCount >= 3 || dbUser.residentProfile?.isDead) {
                    // Force the session to expire immediately (triggering auto-logout)
                    token.exp = 1; // Set to very small number to trigger expiration
                    token.deactivated = true;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token.deactivated || token.exp === 1) {
                return {} as any;
            }
            if (session.user) {

                (session.user as any).role = token.role;

                (session.user as any).id = token.id;

                (session.user as any).isPasswordChanged = token.isPasswordChanged;

                (session.user as any).managedBarangay = token.managedBarangay;
                (session.user as any).department = token.department || null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.csrf-token" : "next-auth.csrf-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
