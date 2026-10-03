"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PrintQueueTicketProps {
    queueNumber: string;
    residentName?: string;
    serviceName: string;
    appointmentDate: string | Date;
    appointmentSlot: string;
    isPriority?: boolean;
    department?: string;
    dateGenerated?: string | Date;
    branding?: any;
    themeColor?: string;
    triggerPrint?: boolean;
    onPrintCompleted?: () => void;
}

const formatDate = (dateStrOrObj: string | Date | null | undefined): string => {
    if (!dateStrOrObj) return "N/A";
    const date = new Date(dateStrOrObj);
    if (isNaN(date.getTime())) return String(dateStrOrObj);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${m}/${d}/${y}`;
};

const formatDateTime = (dateStrOrObj: string | Date | null | undefined): string => {
    if (!dateStrOrObj) return "N/A";
    const date = new Date(dateStrOrObj);
    if (isNaN(date.getTime())) return String(dateStrOrObj);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const h = String(hours).padStart(2, '0');
    
    return `${m}/${d}/${y} ${h}:${minutes}:${seconds} ${ampm}`;
};

export default function PrintQueueTicket({
    queueNumber,
    serviceName,
    appointmentDate,
    appointmentSlot,
    dateGenerated = new Date(),
    branding,
    triggerPrint = false,
    onPrintCompleted
}: PrintQueueTicketProps) {
    const [mounted, setMounted] = useState(false);
    const [qrLoaded, setQrLoaded] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setQrLoaded(false);
    }, [queueNumber]);

    useEffect(() => {
        if (!mounted || !triggerPrint) return;

        // 1. Guard against browser print mode stripping dark theme
        const isDark = document.documentElement.classList.contains("dark") ||
                       localStorage.getItem("theme") === "dark";

        const restoreTheme = () => {
            if (isDark && !document.documentElement.classList.contains("dark")) {
                document.documentElement.classList.add("dark");
                document.documentElement.classList.remove("light");
            }
        };

        const observer = new MutationObserver(() => {
            restoreTheme();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        window.addEventListener("afterprint", restoreTheme);

        // 2. Perform print via an isolated iframe so main page styles & dark mode remain untouched
        const runPrint = () => {
            try {
                // Remove previous iframe if any
                const existing = document.getElementById("queue-ticket-print-iframe");
                if (existing) existing.remove();

                const iframe = document.createElement("iframe");
                iframe.id = "queue-ticket-print-iframe";
                iframe.style.position = "fixed";
                iframe.style.right = "0";
                iframe.style.bottom = "0";
                iframe.style.width = "0";
                iframe.style.height = "0";
                iframe.style.border = "0";
                iframe.style.visibility = "hidden";
                document.body.appendChild(iframe);

                const iframeDoc = iframe.contentWindow?.document;
                if (!iframeDoc) {
                    restoreTheme();
                    if (onPrintCompleted) onPrintCompleted();
                    return;
                }

                const ticketElement = document.getElementById("queue-ticket-content-template");
                const ticketMarkup = ticketElement ? ticketElement.outerHTML : "";

                iframeDoc.open();
                iframeDoc.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="utf-8">
                            <title>Queue Ticket - ${queueNumber}</title>
                            <style>
                                @page { 
                                    size: auto; 
                                    margin: 0; 
                                }
                                body { 
                                    margin: 0 !important; 
                                    padding: 8mm 0 !important; 
                                    background: white !important;
                                    display: flex !important;
                                    flex-direction: column !important;
                                    align-items: center !important;
                                    justify-content: flex-start !important;
                                    color: black !important;
                                    font-family: monospace;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                #queue-ticket-content-template {
                                    visibility: visible !important;
                                    display: flex !important;
                                    flex-direction: column !important;
                                    width: 68mm !important;
                                    max-width: 68mm !important;
                                    border: 2px solid black !important;
                                    border-radius: 12px !important;
                                    padding: 12px 10px !important;
                                    background: white !important;
                                    box-sizing: border-box !important;
                                    margin: 0 auto !important;
                                    text-align: center !important;
                                }
                                * {
                                    box-sizing: border-box;
                                    color: black !important;
                                }
                            </style>
                        </head>
                        <body>
                            ${ticketMarkup}
                        </body>
                    </html>
                `);
                iframeDoc.close();

                let hasFinished = false;
                let fallbackTimerId: NodeJS.Timeout | null = null;

                const finish = () => {
                    if (hasFinished) return;
                    hasFinished = true;
                    if (fallbackTimerId) {
                        clearTimeout(fallbackTimerId);
                        fallbackTimerId = null;
                    }

                    setTimeout(() => {
                        try {
                            iframe.contentWindow?.focus();
                            iframe.contentWindow?.print();
                        } catch (err) {
                            console.error("Print execution failed:", err);
                        } finally {
                            restoreTheme();
                            if (onPrintCompleted) onPrintCompleted();
                            setTimeout(() => {
                                restoreTheme();
                                observer.disconnect();
                                window.removeEventListener("afterprint", restoreTheme);
                                try { iframe.remove(); } catch {}
                            }, 500);
                        }
                    }, 100);
                };

                // Wait for iframe image (e.g. QR code) to load
                const images = iframeDoc.images;
                let loaded = 0;
                const total = images.length;
                if (total === 0) {
                    finish();
                } else {
                    for (let i = 0; i < total; i++) {
                        if (images[i].complete) {
                            loaded++;
                            if (loaded === total) finish();
                        } else {
                            images[i].onload = () => {
                                loaded++;
                                if (loaded === total) finish();
                            };
                            images[i].onerror = () => {
                                loaded++;
                                if (loaded === total) finish();
                            };
                        }
                    }
                    // Fallback timeout in case image never fires
                    fallbackTimerId = setTimeout(finish, 800);
                }
            } catch (err) {
                console.error("Iframe print error:", err);
                restoreTheme();
                observer.disconnect();
                window.removeEventListener("afterprint", restoreTheme);
                if (onPrintCompleted) onPrintCompleted();
            }
        };

        if (qrLoaded) {
            runPrint();
        } else {
            const fallbackTimer = setTimeout(runPrint, 300);
            return () => {
                clearTimeout(fallbackTimer);
                observer.disconnect();
                window.removeEventListener("afterprint", restoreTheme);
            };
        }

        return () => {
            restoreTheme();
            observer.disconnect();
            window.removeEventListener("afterprint", restoreTheme);
        };
    }, [mounted, triggerPrint, qrLoaded, queueNumber, onPrintCompleted]);

    if (!mounted) return null;

    // Render hidden offscreen template for extracting markup when printing
    return createPortal(
        <div
            id="queue-ticket-print-portal"
            style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: '68mm',
                visibility: 'hidden',
                overflow: 'hidden',
                zIndex: -1,
                pointerEvents: 'none'
            }}
        >
            <div
                id="queue-ticket-content-template"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'monospace',
                    lineHeight: 1.3,
                    color: 'black',
                    background: 'white',
                    padding: '12px 10px',
                    border: '2px solid black',
                    borderRadius: '12px',
                    textAlign: 'center',
                    width: '68mm',
                    maxWidth: '100%',
                    margin: '0 auto',
                    boxSizing: 'border-box'
                }}
            >
                {/* Official LGU Logo & Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                    {branding?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={branding.logo}
                            alt="LGU Seal"
                            style={{ width: '36px', height: '36px', filter: 'grayscale(1) contrast(1.2)', marginBottom: '4px' }}
                        />
                    ) : (
                        <div style={{ width: '30px', height: '30px', border: '1.5px solid black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                            LGU
                        </div>
                    )}
                    <span style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#333' }}>
                        Republic of the Philippines
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>
                        Municipality of E-LGU
                    </span>
                    <span style={{ fontSize: '7.5px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px', border: '1px solid black', padding: '1px 4px', borderRadius: '3px' }}>
                        E-LGU Queue Portal
                    </span>
                </div>

                {/* Dotted Divider */}
                <div style={{ borderTop: '1.5px dotted black', margin: '6px 0' }}></div>

                {/* Ticket Number Section */}
                <div style={{ padding: '2px 0' }}>
                    <span style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        Queue Ticket Number
                    </span>
                    <div style={{ 
                        border: '1.5px dashed black', 
                        padding: '8px 4px', 
                        borderRadius: '6px',
                        display: 'inline-block',
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#fcfcfc'
                    }}>
                        <span style={{ 
                            fontSize: '20px', 
                            fontWeight: '900', 
                            letterSpacing: '0.5px',
                            fontFamily: 'monospace',
                            display: 'block'
                        }}>
                            {queueNumber}
                        </span>
                    </div>
                </div>

                {/* Dotted Divider */}
                <div style={{ borderTop: '1.5px dotted black', margin: '6px 0' }}></div>

                {/* Transaction Details */}
                <div style={{ fontSize: '9px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', margin: '2px 0 6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
                        <span style={{ fontWeight: 'normal', color: '#333' }}>Service Type:</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '60%' }}>{serviceName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
                        <span style={{ fontWeight: 'normal', color: '#333' }}>Date:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatDate(appointmentDate)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
                        <span style={{ fontWeight: 'normal', color: '#333' }}>Schedule:</span>
                        <span style={{ fontWeight: 'bold' }}>{appointmentSlot}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1px' }}>
                        <span style={{ fontWeight: 'normal', color: '#555' }}>Created On:</span>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>{formatDateTime(dateGenerated)}</span>
                    </div>
                </div>

                {/* Dotted Divider */}
                <div style={{ borderTop: '1.5px dotted black', margin: '4px 0 6px 0' }}></div>

                {/* Waiting Instructions */}
                <div style={{ fontSize: '8px', lineHeight: 1.3, marginBottom: '10px', background: '#fafafa', padding: '6px', border: '1px solid #eee', borderRadius: '6px' }}>
                    <p style={{ margin: '0', fontWeight: 'bold' }}>Please wait for your number to be called.</p>
                    <p style={{ margin: '0 0 4px 0', fontStyle: 'italic', color: '#555', fontSize: '7.5px' }}>
                        (Mangyaring hintayin na tawagin ang inyong numero.)
                    </p>
                    <p style={{ margin: '0', fontWeight: 'bold' }}>Please have your physical documents ready.</p>
                    <p style={{ margin: '0', fontStyle: 'italic', color: '#555', fontSize: '7.5px' }}>
                        (Ihanda ang inyong mga kinakailangang dokumento.)
                    </p>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(queueNumber)}`}
                        alt="QR Code"
                        style={{ width: '85px', height: '85px', border: '1px solid black', padding: '3px', borderRadius: '3px' }}
                        onLoad={() => setQrLoaded(true)}
                    />
                    <span style={{ fontSize: '6.5px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Scan QR Code at Counter
                    </span>
                </div>

                {/* Dotted Divider */}
                <div style={{ borderTop: '1.5px dotted black', margin: '8px 0 4px 0' }}></div>

                <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Smart Governance Portal
                </div>
                <div style={{ fontSize: '6px', color: '#666', marginTop: '1px' }}>
                    Municipality of E-LGU
                </div>
            </div>
        </div>,
        document.body
    );
}
