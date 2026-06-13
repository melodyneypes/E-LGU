"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function NetworkInterceptor() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    const url = typeof args[0] === 'string' 
                        ? args[0] 
                        : (args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url || '');
                    
                    // Bypass NextAuth authentication routes completely
                    if (url.includes('api/auth')) {
                        return response;
                    }

                    // Intercept only standard actions/API requests, ignore static resources/fonts/images
                    if (url.includes('/api/') || (!url.includes('.') && !url.includes('_next/data'))) {
                        try {
                            const clone = response.clone();
                            const contentType = clone.headers.get("content-type");
                            if (contentType && contentType.includes("application/json")) {
                                const data = await clone.json();
                                const msg = data.error || data.message || `Server returned code ${response.status}`;
                                toast.error(`Network Request Failed: ${msg}`);
                            } else {
                                const text = await clone.text();
                                toast.error(`Error ${response.status}: ${text.slice(0, 100) || response.statusText}`);
                            }
                        } catch {
                            toast.error(`Request Failed: Server responded with status ${response.status}`);
                        }
                    }
                }
                return response;
            } catch (error: any) {
                toast.error(`Network Connection Failed: ${error.message || 'Please check your internet connection'}`);
                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
