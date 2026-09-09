import { supabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = "system-assets";

function isValidImageOrPdf(buffer: Buffer, filename: string, mimeType?: string): boolean {
    const allowedExtensions = /\.(jpe?g|png|webp|pdf|docx?)$/i;
    if (!allowedExtensions.test(filename)) {
        return false;
    }

    if (buffer.length < 4) return false;
    const hex = buffer.toString("hex", 0, 12).toUpperCase();

    let isMagicValid = false;
    let expectedMime = "";
    if (hex.startsWith("FFD8FF")) {
        isMagicValid = true;
        expectedMime = "image/jpeg";
    } else if (hex.startsWith("89504E470D0A1A0A")) {
        isMagicValid = true;
        expectedMime = "image/png";
    } else if (hex.startsWith("25504446")) {
        isMagicValid = true;
        expectedMime = "application/pdf";
    } else if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
        isMagicValid = true;
        expectedMime = "image/webp";
    } else if (hex.startsWith("504B0304") || hex.startsWith("D0CF11E0")) {
        // ZIP/DOCX is 504B0304, old DOC is D0CF11E0
        isMagicValid = true;
        expectedMime = mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    if (!isMagicValid) {
        return false;
    }

    if (mimeType && mimeType !== "application/octet-stream") {
        const lowerMime = mimeType.toLowerCase();
        const lowerExpected = expectedMime.toLowerCase();
        
        if (lowerExpected === "image/jpeg" && (lowerMime === "image/jpeg" || lowerMime === "image/jpg")) {
            return true;
        }
        return lowerMime === lowerExpected;
    }

    return true;
}

/**
 * Uploads a file to Supabase Storage
 * @param file The file to upload
 * @param path The path within the bucket (e.g., 'logos/site-logo.png')
 * @param bucket The bucket name (defaults to system-assets)
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
    file: File | Buffer,
    path: string,
    bucket: string = DEFAULT_BUCKET,
    contentType?: string
): Promise<string | null> {
    try {
        // Convert to buffer for validation
        let buffer: Buffer;
        if (Buffer.isBuffer(file)) {
            buffer = file;
        } else if (file instanceof File) {
            buffer = Buffer.from(await file.arrayBuffer());
        } else if (typeof file === "string") {
            if ((file as string).startsWith("data:")) {
                const arr = (file as string).split(',');
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                buffer = Buffer.from(u8arr);
            } else {
                buffer = Buffer.from(file, "base64");
            }
        } else {
            buffer = Buffer.from(file as any);
        }

        const name = (file as any).name || path.split('/').pop() || "";
        const mimeType = contentType || (file as any).type || "";

        if (!isValidImageOrPdf(buffer, name, mimeType)) {
            console.error(`Blocked upload attempt: File ${name} has invalid signature/headers.`);
            return null;
        }

        // Sanitize path segments to replace special/non-ASCII characters with underscores
        const sanitizedPath = path
            .split('/')
            .map(segment => segment.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_+/g, "_"))
            .join('/');

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(sanitizedPath, buffer, {
                upsert: true, // Overwrite if exists
                contentType: contentType || (file as any).type || 'application/octet-stream'
            });

        if (error) {
            console.error("Supabase Storage Upload Error:", error);
            return null;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error("Storage Service Error:", error);
        return null;
    }
}

/**
 * Deletes a file from Supabase Storage by its public URL
 * @param url The public URL of the file to delete
 * @param bucket The bucket name
 */
export async function deleteFileByUrl(url: string, bucket: string = DEFAULT_BUCKET) {
    if (!url) return;
    
    try {
        // Extract bucket and path from Supabase storage URL
        // Example format 1: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        // Example format 2: https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
        let targetBucket = bucket;
        let filePath = "";

        if (url.includes("/storage/v1/object/public/")) {
            const parts = url.split("/storage/v1/object/public/")[1]?.split("/");
            if (parts && parts.length >= 2) {
                targetBucket = parts[0];
                filePath = parts.slice(1).join("/").split("?")[0];
            }
        } else if (url.includes("/storage/v1/object/sign/")) {
            const parts = url.split("/storage/v1/object/sign/")[1]?.split("/");
            if (parts && parts.length >= 2) {
                targetBucket = parts[0];
                filePath = parts.slice(1).join("/").split("?")[0];
            }
        } else if (url.includes(`${bucket}/`)) {
            const urlParts = url.split(`${bucket}/`);
            if (urlParts.length >= 2) {
                filePath = urlParts[1].split("?")[0];
            }
        }

        if (!filePath) {
            console.warn("[deleteFileByUrl] Could not extract file path from URL:", url);
            return;
        }

        if (!supabaseAdmin) {
            console.error("[deleteFileByUrl] supabaseAdmin is not initialized. Check SUPABASE_SERVICE_ROLE_KEY environment variable.");
            return;
        }

        const decodedPath = decodeURIComponent(filePath);
        console.log(`[Storage Cleanup] Deleting "${decodedPath}" from Supabase bucket "${targetBucket}"...`);
        
        const { data, error } = await supabaseAdmin.storage
            .from(targetBucket)
            .remove([decodedPath]);

        if (error) {
            console.error("[deleteFileByUrl] Supabase Storage Delete Error:", error);
        } else {
            console.log(`[Storage Cleanup] Successfully deleted "${decodedPath}" from bucket "${targetBucket}". Data:`, data);
        }
    } catch (error) {
        console.error("Storage Service Delete Error:", error);
    }
}

/**
 * Verifies the byte header (magic numbers) of a file stored in Supabase.
 * Uses supabaseAdmin directly to avoid signed URL Range header/CORS issues.
 * Supports PDF, PNG, JPEG, WebP, and GIF.
 */
export async function verifyFileSignature(url: string, bucket: string = DEFAULT_BUCKET): Promise<{ isValid: boolean; error?: string }> {
    try {
        if (!supabaseAdmin) {
            return { isValid: true };
        }

        let targetBucket = bucket;
        let filePath = "";

        if (url.includes("/storage/v1/object/public/")) {
            const parts = url.split("/storage/v1/object/public/")[1]?.split("/");
            if (parts && parts.length >= 2) {
                targetBucket = parts[0];
                filePath = parts.slice(1).join("/").split("?")[0];
            }
        } else if (url.includes("/storage/v1/object/sign/")) {
            const parts = url.split("/storage/v1/object/sign/")[1]?.split("/");
            if (parts && parts.length >= 2) {
                targetBucket = parts[0];
                filePath = parts.slice(1).join("/").split("?")[0];
            }
        } else if (url.includes(`${bucket}/`)) {
            const urlParts = url.split(`${bucket}/`);
            if (urlParts.length >= 2) {
                filePath = urlParts[1].split("?")[0];
            }
        }

        if (!filePath) {
            // If URL doesn't match standard Supabase format, don't block submission
            return { isValid: true };
        }

        const decodedPath = decodeURIComponent(filePath);

        // Download directly via supabaseAdmin without signed URL Range restrictions
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
            .from(targetBucket)
            .download(decodedPath);

        if (downloadError || !blob) {
            const message = downloadError?.message || "";
            if (/not found/i.test(message) || (downloadError as any)?.statusCode === 404) {
                return { isValid: false, error: "File no longer exists in storage" };
            }
            console.warn(`[verifyFileSignature] Transient download error for "${decodedPath}" in bucket "${targetBucket}":`, downloadError);
            return { isValid: true };
        }

        const arrayBuffer = await blob.slice(0, 32).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        if (bytes.length < 4) {
            return { isValid: false, error: "File too small or empty" };
        }

        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, "0").toUpperCase();
        }

        // PDF signature check: Starts with %PDF- (25 50 44 46)
        if (hex.startsWith("25504446")) {
            return { isValid: true };
        }
        // PNG signature check: Starts with 89 50 4E 47
        if (hex.startsWith("89504E47")) {
            return { isValid: true };
        }
        // JPEG signature check: Starts with FF D8
        if (hex.startsWith("FFD8")) {
            return { isValid: true };
        }
        // WebP signature check: Starts with RIFF (52 49 46 46) and contains WEBP (57 45 42 50)
        if (hex.startsWith("52494646") && hex.length >= 24 && hex.substring(16, 24) === "57454250") {
            return { isValid: true };
        }
        // GIF signature check: Starts with GIF8 (47 49 46 38)
        if (hex.startsWith("47494638")) {
            return { isValid: true };
        }

        return { isValid: false, error: "Invalid file signature" };
    } catch (error: any) {
        console.error("verifyFileSignature error:", error);
        return { isValid: true };
    }
}

/**
 * Recursively scans a payload object or array for Supabase URLs and checks their byte signatures.
 * Automatically deletes any file that fails signature validation.
 */
export async function validatePayloadFiles(payload: any, bucket: string = DEFAULT_BUCKET): Promise<{ success: boolean; error?: string }> {
    if (!payload) return { success: true };

    const urls: string[] = [];

    // Helper to recursively walk through the object finding Supabase URLs
    const extractUrls = (val: any) => {
        if (!val) return;
        if (typeof val === "string") {
            if (val.includes(".supabase.co/storage/v1/object/")) {
                urls.push(val);
            }
        } else if (Array.isArray(val)) {
            val.forEach(extractUrls);
        } else if (typeof val === "object") {
            Object.values(val).forEach(extractUrls);
        }
    };

    extractUrls(payload);

    if (urls.length === 0) return { success: true };

    try {
        // Inspect files in parallel
        const results = await Promise.all(urls.map(async (url) => {
            const check = await verifyFileSignature(url, bucket);
            return { url, ...check };
        }));

        // Missing objects are stale references, not upload corruption.
        const failed = results.find(r => !r.isValid && r.error !== "File no longer exists in storage");
        if (failed) {
            console.error("[validatePayloadFiles] File verification failed for:", failed.url, failed.error);
            // Clean up the invalid file immediately
            await deleteFileByUrl(failed.url, bucket);
            return {
                success: false,
                error: "The uploaded document appears to be corrupted or in an invalid format. Please upload a standard PDF or Image."
            };
        }
    } catch (err: any) {
        console.error("validatePayloadFiles error:", err);
        return { success: false, error: "Failed to verify document integrity." };
    }

    return { success: true };
}
