/**
 * Utility to validate if a string is a valid image source URL (absolute, relative, blob, or data URL).
 */
export function isValidUrl(url: string | null | undefined): url is string {
    if (!url) return false;
    try {
        const trimmed = url.trim();
        if (
            trimmed.startsWith("/") || 
            trimmed.startsWith("blob:") || 
            trimmed.startsWith("data:")
        ) {
            return true;
        }
        new URL(trimmed);
        return true;
    } catch {
        return false;
    }
}
