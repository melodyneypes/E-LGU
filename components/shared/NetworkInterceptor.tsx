"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function NetworkInterceptor() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === 'string' 
                ? args[0] 
                : (args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url || '');
            
            const isRelativeApi = url.startsWith('/api/') || url.startsWith('api/');
            const isLocalApi = url.includes(window.location.origin + '/api/');
            const isInternalRoute = !url.startsWith('http') && !url.includes('.') && !url.includes('_next/data');
            const shouldIntercept = (isRelativeApi || isLocalApi || isInternalRoute) && !url.includes('api/auth');

            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok && shouldIntercept && response.status !== 404) {
                    try {
                        const clone = response.clone();
                        const contentType = clone.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const data = await clone.json();
                            const msg = data.error || data.message || `Server returned code ${response.status}`;
                            toast.error(`Network Request Failed: ${msg}`);
                        }
                    } catch {
                        // Silent catch for clone/parse errors
                    }
                }
                return response;
            } catch (error: any) {
                const isAbortOrFetchErr = 
                    error?.name === "AbortError" || 
                    error?.message?.includes("aborted") || 
                    error?.message?.includes("abort") ||
                    error?.message?.includes("Failed to fetch") ||
                    error?.message?.includes("Load failed");

                if (shouldIntercept && !isAbortOrFetchErr) {
                    toast.error(`Network Connection Failed: ${error.message || 'Please check your connection'}`);
                }
                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
