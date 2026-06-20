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
                if (!response.ok && shouldIntercept) {
                    try {
                        const clone = response.clone();
                        const contentType = clone.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const data = await clone.json();
                            const msg = data.error || data.message || `Server returned code ${response.status}`;
                            toast.error(`Network Request Failed: ${msg}`);
                        } else {
                            const text = await clone.text();
                            const isHtml = text.trim().startsWith("<") || text.trim().toLowerCase().startsWith("<!doctype");
                            if (isHtml) {
                                toast.error(`Error ${response.status}: An unexpected server error occurred. Please try again later.`);
                            } else {
                                toast.error(`Error ${response.status}: ${text.slice(0, 100) || response.statusText}`);
                            }
                        }
                    } catch {
                        toast.error(`Request Failed: Server responded with status ${response.status}`);
                    }
                }
                return response;
            } catch (error: any) {
                if (shouldIntercept) {
                    toast.error(`Network Connection Failed: ${error.message || 'Please check your internet connection'}`);
                    throw error;
                }
                // For external (non-intercepted) requests, silently re-throw so
                // the calling code's own .catch() handler can deal with it without
                // the NetworkInterceptor surfacing it as an unhandled error.
                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
