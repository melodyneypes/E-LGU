import { z } from "zod";

/**
 * Universal string sanitization utility.
 * Strips HTML tags, inline scripts, and dangerous characters.
 */
export function sanitizeString(input: string): string {
    if (typeof input !== "string") return "";
    
    // 1. Remove script tags and their inner content
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    
    // 2. Remove HTML tags but keep text content
    sanitized = sanitized.replace(/<[^>]*>/g, "");
    
    // 3. Remove inline events (e.g. onload, onerror, onclick)
    sanitized = sanitized.replace(/on\w+\s*=\s*(["'].*?["']|[^ >\t\r\n]+)/gi, "");
    
    return sanitized.trim();
}

/**
 * Prunes a resident object/snapshot to only include lightweight essential fields.
 * Strips out heavy fields like facialRecognition, binary data, and irrelevant meta.
 */
export function pruneResidentSnapshot(resident: any): any {
    if (!resident || typeof resident !== "object") return resident;
    return {
        // id: resident.id,
        firstName: resident.firstName,
        lastName: resident.lastName,
        middleName: resident.middleName,
        suffix: resident.suffix,
        gender: resident.gender,
        dateOfBirth: resident.dateOfBirth,
        placeOfBirth: resident.placeOfBirth,
        civilStatus: resident.civilStatus,
        citizenship: resident.citizenship,
        contactNumber: resident.contactNumber,
        email: resident.email,
        houseNumber: resident.houseNumber,
        street: resident.street,
        sitio: resident.sitio,
        purok: resident.purok,
        barangay: resident.barangay,
        municipality: resident.municipality,
        province: resident.province,
        // height: resident.height,
        // weight: resident.weight,
        occupation: resident.occupation,
        tin: resident.tin,
        idType: resident.idType,
        idFrontUrl: resident.idFrontUrl,
        idBackUrl: resident.idBackUrl,
    };
}

/**
 * Recursively sanitizes every string property within an object or array.
 * Highly useful for nested resident snapshot or additional data structures.
 */
export function sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === "string") {
        if (obj.startsWith("data:") && obj.includes(";base64,")) {
            console.log(`[Base64 Guardrail] Intercepted and stripped base64 string starting with: "${obj.slice(0, 50)}..."`);
            return "" as unknown as T; // Strip out heavy base64 data to prevent database bloat/egress issues
        }
        return sanitizeString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }

    if (typeof obj === "object") {
        // If this object represents a resident profile snapshot, prune it to clean up heavy fields globally
        if (obj && typeof (obj as any).firstName === "string" && typeof (obj as any).lastName === "string") {
            const pruned = pruneResidentSnapshot(obj);
            // Run standard string sanitization on the pruned fields
            const sanitizedPruned: Record<string, any> = {};
            for (const key in pruned) {
                sanitizedPruned[key] = sanitizeObject(pruned[key]);
            }
            return sanitizedPruned as unknown as T;
        }

        const sanitizedObj: Record<string, any> = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key === "facialRecognition") continue; // Exclude heavy face vectors from snapshots
                sanitizedObj[key] = sanitizeObject((obj as Record<string, any>)[key]);
            }
        }
        return sanitizedObj as unknown as T;
    }

    return obj;
}

/**
 * Strips protocols other than http:// and https:// (such as javascript: or data:).
 * Relative URLs starting with / are allowed.
 */
export function sanitizeUrl(url: string | null | undefined): string {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return "";
}

// Zod schemas for shared models and params
export const idSchema = z.string().min(1, "ID is required").max(100);
export const remarksSchema = z.string().max(1000).transform(sanitizeString);
export const ctcNumberSchema = z.string().max(50).transform(sanitizeString);

export const fulfillmentTypeSchema = z.enum(["PICK_UP", "DELIVERY", "E_COPY"]);
export const paymentTypeSchema = z.enum(["CASH", "GCASH", "CASH_ON_DELIVERY"]);

// Forgot Password schemas
export const ForgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

export const ResetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
        .regex(/[0-9]/, "Must contain at least 1 number"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

