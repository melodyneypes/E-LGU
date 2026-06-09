"use client";

import { useRef, useCallback } from "react";
import { toast } from "sonner";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";

function isDraftEmpty(obj: any): boolean {
    if (!obj) return true;
    if (typeof obj !== "object") return false;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Ignore default route step name or common defaults if they are the only things present
            if (key === "currentStep" && (obj[key] === "GUIDE" || obj[key] === "START")) continue;
            if ([
                "typeId", "applicantType", "incomeSource", 
                "businessType", "orgType", "agreeToTerms", "step", 
                "pathway", "residentData"
            ].includes(key)) continue;
            
            const val = obj[key];
            if (val === null || val === undefined) continue;
            if (typeof val === "string" && val.trim() !== "") return false;
            if (typeof val === "boolean" && val === true) return false;
            if (Array.isArray(val) && val.length > 0) return false;
            if (typeof val === "object" && !isDraftEmpty(val)) return false;
        }
    }
    return true;
}

export function useDraft<T extends Record<string, any>>(draftKey: string) {
    const draftRestored = useRef(false);
    const filesRestored = useRef(false);

    /**
     * Hydrates the form data from localStorage if a draft exists.
     * @param setFormData React state setter for the form data
     * @param onRestored Optional callback that runs when draft is successfully restored (e.g. to clear out File objects)
     */
    const hydrateDraft = useCallback((
        setFormData: React.Dispatch<React.SetStateAction<T>>,
        onRestored?: (parsedData: Partial<T>) => void
    ) => {
        try {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft && !draftRestored.current) {
                draftRestored.current = true;
                const parsed = JSON.parse(savedDraft);
                
                setFormData(prev => ({
                    ...prev,
                    ...parsed,
                }));
                
                if (onRestored) {
                    onRestored(parsed);
                }
                
                if (!isDraftEmpty(parsed)) {
                    toast.success("Draft application restored successfully!");
                }
            }
        } catch (error) {
            console.error(`Failed to parse draft from localStorage for key ${draftKey}`, error);
            // If the draft is corrupted, clean it up
            localStorage.removeItem(draftKey);
        }
    }, [draftKey]);

    /**
     * Hydrates saved files from IndexedDB.
     * @param onRestoredFiles Callback that will receive the map of restored Files (fieldName -> File)
     */
    const hydrateDraftFiles = useCallback(async (
        onRestoredFiles: (files: Record<string, File>) => void
    ) => {
        if (filesRestored.current) return;
        try {
            const files = await getDraftFiles(draftKey);
            if (Object.keys(files).length > 0) {
                filesRestored.current = true;
                onRestoredFiles(files);
            }
        } catch (error) {
            console.error(`Failed to hydrate draft files for key ${draftKey}`, error);
        }
    }, [draftKey]);

    /**
     * Persists the selected state fields to localStorage.
     * @param stateToPersist The partial state object containing ONLY the fields you want to save (e.g. no Files)
     */
    const persistDraft = useCallback((stateToPersist: Partial<T>) => {
        try {
            localStorage.setItem(draftKey, JSON.stringify(stateToPersist));
        } catch (error) {
            console.error(`Failed to persist draft to localStorage for key ${draftKey}`, error);
        }
    }, [draftKey]);

    /**
     * Persists a single file to IndexedDB.
     * @param fieldName The name of the file field (e.g. 'idFile', 'proofFile')
     * @param file The File object, or null to remove it
     */
    const persistDraftFile = useCallback(async (fieldName: string, file: File | null) => {
        try {
            await saveDraftFile(draftKey, fieldName, file);
        } catch (error) {
            console.error(`Failed to persist draft file ${fieldName} for key ${draftKey}`, error);
        }
    }, [draftKey]);

    /**
     * Clears the draft from localStorage and IndexedDB.
     */
    const clearDraft = useCallback(async () => {
        try {
            localStorage.removeItem(draftKey);
            await clearDraftFiles(draftKey);
        } catch (error) {
            console.error(`Failed to clear draft for key ${draftKey}`, error);
        }
    }, [draftKey]);

    return { 
        hydrateDraft, 
        hydrateDraftFiles, 
        persistDraft, 
        persistDraftFile, 
        clearDraft, 
        draftRestored,
        filesRestored
    };
}

