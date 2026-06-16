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
