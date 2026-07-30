import { useState } from 'react';
import { getSecureUploadUrlAction } from '@/app/auth/actions';

export function useAsyncUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (
    file: File, 
    fieldName: string, 
    serviceType: string = "building_permit"
  ): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split('.').pop() || 'tmp';
      const { success, signedUrl, publicUrl, error } = await getSecureUploadUrlAction(fieldName, serviceType, ext);
      
      if (!success || !signedUrl || !publicUrl) {
        console.error("Failed to get signed URL:", error);
        return null;
      }

      // We use XMLHttpRequest instead of fetch to track upload progress if needed
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(publicUrl);
          } else {
            console.error("Upload failed with status:", xhr.status);
            resolve(null);
          }
        };

        xhr.onerror = () => {
          console.error("XHR network error during upload");
          resolve(null);
        };

        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });
    } catch (error) {
      console.error("Upload exception:", error);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  return { uploadFile, isUploading, uploadProgress };
}
