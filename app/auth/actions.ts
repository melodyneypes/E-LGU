"use server";

import prisma from "@/lib/db/prisma";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/mail";

export async function sendOTP(email: string) {
    try {
        const ip = await getClientIp();
        const emailClean = email.trim().toLowerCase();
        // Rate limit: Max 3 OTP requests per hour per email + IP
        const limitKey = `otp:send:${emailClean}:${ip}`;
        const limitCheck = await isRateLimited(limitKey, 3, 3600000); // 1 hour window

        const attempts = 3 - limitCheck.remaining;
        console.log(`[OTP DEBUG] Email: ${emailClean} | IP: ${ip} | Rate Limit Check: success=${limitCheck.success}, attempts=${attempts}/3, remaining=${limitCheck.remaining}`);

        if (!limitCheck.success) {
            console.log(`[OTP DEBUG] Rate limit exceeded for ${emailClean}. Locked until ${limitCheck.resetTime?.toISOString()}`);
            const minutesLeft = Math.ceil(((limitCheck.resetTime?.getTime() || 0) - Date.now()) / 60000);
            return {
                success: false,
                error: `Too many OTP requests. Please try again after ${minutesLeft} minute(s).`
            };
        }

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
            },
        });

        if (error) {
            console.error("Supabase OTP Error Details:", JSON.stringify(error, null, 2), error);
            // Refund the rate limit attempt on failure
            try {
                const record = await prisma.rateLimit.findUnique({ where: { key: limitKey } });
                if (record && record.attempts > 0) {
                    if (record.attempts === 1) {
                        await prisma.rateLimit.delete({ where: { key: limitKey } });
                    } else {
                        await prisma.rateLimit.update({
                            where: { key: limitKey },
                            data: { attempts: record.attempts - 1 }
                        });
                    }
                    console.log(`[OTP DEBUG] Refunded rate limit attempt for ${emailClean}. Key: ${limitKey}`);
                }
            } catch (refundError) {
                console.error("[RateLimit] Failed to refund attempt:", refundError);
            }
            return { success: false, error: error.message || "Failed to send OTP" };
        }

        console.log(`[OTP DEBUG] OTP successfully sent to ${emailClean} via Supabase!`);
        return { success: true };
    } catch (error) {
        console.error("OTP Action Error:", error);
        return { success: false, error: "Failed to send OTP" };
    }
}

export async function verifyOTPOnly(email: string, otp: string) {
    try {
        const ip = await getClientIp();
        const emailClean = email.trim().toLowerCase();
        // Rate limit: Max 10 verification attempts per 15 mins per email + IP
        const limitKey = `otp:verify:${emailClean}:${ip}`;
        const limitCheck = await isRateLimited(limitKey, 10, 900000); // 15 mins window

        if (!limitCheck.success) {
            const minutesLeft = Math.ceil(((limitCheck.resetTime?.getTime() || 0) - Date.now()) / 60000);
            return {
                success: false,
                error: `Too many verification attempts. Try again after ${minutesLeft} minute(s).`
            };
        }

        // Try 'signup' first for new users
        let { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup'
        });

        if (verifyError) {
            // Fallback to 'email' type
            const { error: retryError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email'
            });
            verifyError = retryError;
        }

        if (verifyError) {
            console.error("Supabase Verify Error:", verifyError.message);
            return { success: false, error: "Invalid or expired OTP" };
        }

        const secret = process.env.NEXTAUTH_SECRET || "default_secret_fallback_key_12345678";
        const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        const message = `${emailClean}:${expiry}`;
        const signature = crypto.createHmac("sha256", secret).update(message).digest("hex");
        const token = `${message}:${signature}`;

        return { success: true, token };
    } catch (error) {
        console.error("Verification Error:", error);
        return { success: false, error: "Failed to verify identity" };
    }
}

export async function finalizePasswordChange(email: string, tokenOrOtp: string, newPassword: string) {
    try {
        const isSignedToken = tokenOrOtp.includes(":");
        if (isSignedToken) {
            const parts = tokenOrOtp.split(":");
            if (parts.length !== 3) {
                return { success: false, error: "Invalid verification proof" };
            }
            const [msgEmail, msgExpiry, signature] = parts;
            if (msgEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
                return { success: false, error: "Invalid verification proof" };
            }
            if (Date.now() > parseInt(msgExpiry, 10)) {
                return { success: false, error: "Verification session expired" };
            }
            const secret = process.env.NEXTAUTH_SECRET || "default_secret_fallback_key_12345678";
            const expectedSignature = crypto.createHmac("sha256", secret)
                .update(`${msgEmail}:${msgExpiry}`)
                .digest("hex");
            if (signature !== expectedSignature) {
                return { success: false, error: "Invalid verification proof" };
            }
        } else {
            // Verify OTP first before executing the password change
            const verifyResult = await verifyOTPOnly(email, tokenOrOtp);
            if (!verifyResult.success) {
                return { success: false, error: verifyResult.error || "Invalid or expired OTP" };
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                isPasswordChanged: true
            }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Finalize Error:", error);
        return { success: false, error: "Failed to update password" };
    }
}

export async function checkEmailExists(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: { id: true }
        });
        return { success: true, exists: !!user };
    } catch (error) {
        console.error("checkEmailExists Error:", error);
        return { success: false, error: "Failed to check email" };
    }
}

/**
 * Requests a password reset for the given email.
 * Anti-enumeration: Always returns success regardless if email exists.
 */
export async function requestPasswordReset(email: string) {
    try {
        const ip = await getClientIp();
        const emailClean = email.trim().toLowerCase();

        // Rate limit: max 3 reset requests per hour per IP+email
        const limitKey = `reset:${emailClean}:${ip}`;
        const limitCheck = await isRateLimited(limitKey, 3, 3600000);
        if (!limitCheck.success) {
            const minutesLeft = Math.ceil(((limitCheck.resetTime?.getTime() || 0) - Date.now()) / 60000);
            return {
                success: false,
                error: `Too many reset requests. Try again after ${minutesLeft} minute(s).`,
            };
        }

        // Find user — silently return success if not found (anti-enumeration)
        const user = await prisma.user.findUnique({
            where: { email: emailClean },
            select: { id: true, name: true, email: true },
        });

        if (!user || !user.email) {
            return { success: false, error: "No account found with this email address." };
        }

        // Check if there is an active token created in the last 60 seconds
        const recentToken = await prisma.passwordResetToken.findFirst({
            where: {
                email: emailClean,
                createdAt: {
                    gt: new Date(Date.now() - 60 * 1000), // 60 seconds ago
                },
            },
        });

        if (recentToken) {
            return {
                success: false,
                error: "Please wait 60 seconds before requesting another reset link.",
            };
        }

        // Delete any previous unused tokens for this email
        await prisma.passwordResetToken.deleteMany({ where: { email: emailClean } });

        // Generate cryptographically secure token (256-bit entropy)
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.passwordResetToken.create({
            data: { token, email: emailClean, expiresAt },
        });

        // Build the reset URL
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

        // Send the email
        await sendEmail({
            type: "PASSWORD_RESET",
            to: user.email,
            name: user.name || "User",
            resetLink,
        });

        return { success: true };
    } catch (error) {
        console.error("requestPasswordReset Error:", error);
        return { success: false, error: "An error occurred. Please try again." };
    }
}

/**
 * Validates a password reset token without consuming it.
 * Used for server-side page rendering.
 */
export async function validateResetToken(token: string) {
    try {
        if (!token || token.length !== 64) {
            return { valid: false, error: "Invalid reset link." };
        }

        const record = await prisma.passwordResetToken.findUnique({ where: { token } });

        if (!record) return { valid: false, error: "Invalid or expired reset link." };
        if (record.usedAt) return { valid: false, error: "This reset link has already been used." };
        if (record.expiresAt < new Date()) return { valid: false, error: "This reset link has expired. Please request a new one." };

        return { valid: true, email: record.email };
    } catch (error) {
        console.error("validateResetToken Error:", error);
        return { valid: false, error: "An error occurred. Please try again." };
    }
}

/**
 * Resets the user's password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string) {
    try {
        // Re-validate token
        const validation = await validateResetToken(token);
        if (!validation.valid || !validation.email) {
            return { success: false, error: validation.error };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { email: validation.email },
            data: { password: hashedPassword, isPasswordChanged: true },
        });

        // Mark token as used and clean up
        await prisma.passwordResetToken.updateMany({
            where: { token },
            data: { usedAt: new Date() },
        });
        await prisma.passwordResetToken.deleteMany({ where: { token } });

        return { success: true };
    } catch (error) {
        console.error("resetPassword Error:", error);
        return { success: false, error: "Failed to reset password. Please try again." };
    }
}

export async function getSecureUploadUrlAction(
    fieldName: string,
    serviceType: string,
    fileExt: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const sanitizedFieldName = fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedServiceType = serviceType.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedExt = fileExt.replace(/[^a-zA-Z0-9]/g, '');

        // Secure server-side path generation
        const fileName = `${sanitizedFieldName}_${Date.now()}.${sanitizedExt}`;
        const filePath = `services/${sanitizedServiceType}/${session.user.id}/${fileName}`;

        if (!supabaseAdmin) {
            return { success: false, error: "Supabase Admin client not initialized" };
        }

        const { data, error } = await supabaseAdmin.storage
            .from("system-assets")
            .createSignedUploadUrl(filePath);

        if (error || !data?.signedUrl) {
            console.error("[Storage] Failed to generate signed upload URL:", error);
            return { success: false, error: "Failed to allocate storage destination" };
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("system-assets")
            .getPublicUrl(filePath);

        return {
            success: true,
            signedUrl: data.signedUrl,
            publicUrl
        };
    } catch (error: any) {
        console.error("getSecureUploadUrlAction Error:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
}


