import { supabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = "system-assets";

function isValidImageOrPdf(buffer: Buffer, filename: string, mimeType?: string): boolean {
    const allowedExtensions = /\.(jpe?g|png|webp|pdf)$/i;
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
        // Extract the path from the public URL
        // Example: https://.../storage/v1/object/public/system-assets/logos/my-logo.png
        // We need: 'logos/my-logo.png'
        const urlParts = url.split(`${bucket}/`);
        if (urlParts.length < 2) return;
        
        const path = urlParts[1];
        
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error("Supabase Storage Delete Error:", error);
        }
    } catch (error) {
        console.error("Storage Service Delete Error:", error);
    }
}

/**
 * Verifies the byte header (magic numbers) of a file stored in Supabase by downloading its first 8 bytes.
 * Handles PDF, PNG, and JPEG.
 */
export async function verifyFileSignature(url: string, bucket: string = DEFAULT_BUCKET): Promise<{ isValid: boolean; error?: string }> {
    try {
        const urlParts = url.split(`${bucket}/`);
        if (urlParts.length < 2) {
            return { isValid: false, error: "Invalid storage location format" };
        }
        
        // Extract and decode path
        const path = decodeURIComponent(urlParts[1].split('?')[0]);

        // Generate a short-lived read signed URL from admin client
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 60);

        if (signedError || !signedData?.signedUrl) {
            const statusCode = (signedError as any)?.statusCode ?? (signedError as any)?.status;
            const message = (signedError as any)?.message || "";

            // Missing objects are common during cleanup or when records outlive files.
            // Treat them as validation failures without polluting the logs.
            if (statusCode === 404 || /not found/i.test(message)) {
                return { isValid: false, error: "File no longer exists in storage" };
            }

            console.error(`Failed to generate read signed URL for ${path}:`, signedError);
            return { isValid: false, error: "Could not access storage file" };
        }

        // Fetch only the first 8 bytes to avoid downloading large files
        const response = await fetch(signedData.signedUrl, {
            headers: { Range: "bytes=0-7" }
        });

        if (!response.ok && response.status !== 206) {
            return { isValid: false, error: `Failed to fetch file header: ${response.statusText}` };
        }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Convert bytes to hex string representation
        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, "0").toUpperCase();
        }

        // PDF signature check: Starts with %PDF- (25 50 44 46).
        // Keep synchronous submission validation header-only so uploaded files are
        // not downloaded through the application server a second time.
        if (hex.startsWith("25504446")) {
            return { isValid: true };
        }
        // PNG signature check: Starts with 89 50 4E 47 0D 0A 1A 0A
        if (hex.startsWith("89504E470D0A1A0A")) {
            return { isValid: true };
        }
        // JPEG signature check: Starts with FF D8 FF
        if (hex.startsWith("FFD8FF")) {
            return { isValid: true };
        }

        return { isValid: false, error: "Invalid file signature" };
    } catch (error: any) {
        console.error("verifyFileSignature error:", error);
        return { isValid: false, error: error.message || "Failed to inspect file contents" };
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
            if (val.includes(".supabase.co/storage/v1/object/") && val.includes(`/${bucket}/`)) {
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
