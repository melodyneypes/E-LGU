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

                        // Recreate File object with original name
                        const compressedFile = new File([blob], file.name, {
                            type: file.type || "image/jpeg",
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    file.type || "image/jpeg",
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
