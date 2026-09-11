/**
 * Utility function to compress images client-side using HTML5 Canvas API.
 * Downscales images exceeding the maximum width/height while maintaining aspect ratio,
 * and encodes them to a compressed format with defined quality parameters.
 */
export function compressImage(file: File, maxWidth = 1600, quality = 0.75): Promise<File> {
    return new Promise((resolve) => {
        // Security fallback: only process standard images
        if (!file.type.startsWith("image/")) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Scale proportionally if width exceeds maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // If height also exceeds maxWidth after width scaling, scale by height instead
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    return resolve(file); // Fallback: context not available
                }

                // Render image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Export to Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return resolve(file); // Fallback: blob generation failed
                        }

                        // Recreate File object with original name but with .webp extension
                        let newName = file.name;
                        const extIdx = newName.lastIndexOf(".");
                        if (extIdx !== -1) {
                            newName = newName.substring(0, extIdx) + ".webp";
                        } else {
                            newName = newName + ".webp";
                        }

                        const compressedFile = new File([blob], newName, {
                            type: "image/webp",
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    "image/webp",
                    quality
                );
            };
            img.onerror = () => resolve(file); // Fallback: loading failed
            img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve(file); // Fallback: reading failed
        reader.readAsDataURL(file);
    });
}

/**
 * Specifically tuned compression for Official Documents & Scanner Imports:
 * - Retains high resolution (max 2400px width/height) to preserve dry seals, fine blueprint lines, and signatures.
 * - Compresses 10MB-25MB 300DPI raw scans down to ~700KB-1.5MB for instantaneous, secure uploads.
 * - Leaves PDFs untouched.
 */
export async function compressDocumentScan(file: File): Promise<File> {
    if (!file || !file.type.startsWith("image/")) {
        return file; // Only compress images, keep PDFs and other binaries untouched
    }

    // Skip compression if already lightweight (under 1.5MB)
    if (file.size <= 1.5 * 1024 * 1024) {
        return file;
    }

    // 2400px ensures crystal-clear signature lines and LGU dry-seal visibility while cutting 90% of file size
    return compressImage(file, 2400, 0.85);
}
