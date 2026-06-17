import { supabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = "system-assets";

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
        // Sanitize path segments to replace special/non-ASCII characters with underscores
        const sanitizedPath = path
            .split('/')
            .map(segment => segment.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_+/g, "_"))
            .join('/');

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(sanitizedPath, file, {
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

        // PDF signature check: Starts with %PDF- (25 50 44 46)
        if (hex.startsWith("25504446")) {
            // Fetch the full file content to inspect the PDF internal structure
            const fullResponse = await fetch(signedData.signedUrl);
            if (!fullResponse.ok) {
                return { isValid: false, error: "Failed to download PDF for deep scanning" };
            }
            const pdfBuffer = Buffer.from(await fullResponse.arrayBuffer());
            const pdfText = pdfBuffer.toString("utf8");

            const suspiciousPatterns = [
                /\/JavaScript/i,
                /\/JS/i,
                /\/Launch/i,
                /\/OpenAction/i,
                /\/AA/i
            ];

            const hasMaliciousPattern = suspiciousPatterns.some(pattern => pattern.test(pdfText));
            if (hasMaliciousPattern) {
                return { isValid: false, error: "Suspicious script or launch action detected in PDF file." };
            }

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

        const failed = results.find(r => !r.isValid);
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
