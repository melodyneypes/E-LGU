"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PrintQueueTicketProps {
    queueNumber: string;
    residentName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentSlot: string;
    isPriority: boolean;
    branding: {
        logo?: string | null;
        word1?: string;
        word2?: string;
    };
    themeColor?: string;
    triggerPrint?: boolean;
    onPrintCompleted?: () => void;
}

export default function PrintQueueTicket({
    queueNumber,
    residentName,
    serviceName,
    appointmentDate,
    appointmentSlot,
    isPriority,
    branding,
    themeColor = "#2563eb",
    triggerPrint = false,
    onPrintCompleted
}: PrintQueueTicketProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && triggerPrint) {
            setTimeout(() => {
                window.print();
                if (onPrintCompleted) onPrintCompleted();
            }, 500);
        }
    }, [mounted, triggerPrint, queueNumber, onPrintCompleted]);

    if (!mounted) return null;

    const isValidUrl = (url?: string | null) => {
        if (!url) return false;
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
    };

    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        size: 80mm 120mm; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                    }
                    body > * { 
                        display: none !important; 
                    }
                    #queue-ticket-print-portal {
                        display: block !important;
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        visibility: visible !important;
                        overflow: visible !important;
                        padding: 4mm !important;
                        background: white !important;
                        z-index: 99999 !important;
                        color: black !important;
                    }
                    #queue-ticket-print-portal * {
                        visibility: visible !important;
                        color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            <div
                id="queue-ticket-print-portal"
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '80mm',
                    height: '120mm',
                    visibility: 'hidden',
                    overflow: 'hidden',
                    zIndex: -1,
                    pointerEvents: 'none'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        border: '2px solid black',
                        borderRadius: '4px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.2,
                        color: 'black',
                        background: 'white',
                        padding: '10px'
                    }}
                >
                    {/* Header Banner */}
                    <div style={{ borderBottom: '2px solid black', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {branding.logo && isValidUrl(branding.logo) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={branding.logo}
                                alt="Municipal Logo"
                                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ width: '30px', height: '30px', border: '2px solid black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '10px' }}>
                                {branding.word1?.charAt(0) || 'M'}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
                                {branding.word1 || "MUNICIPALITY"}{' '}
                                <span style={{ color: themeColor }}>{branding.word2 || "PORTAL"}</span>
                            </span>
                            <span style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                                Municipal Treasury Department
                            </span>
                        </div>
                    </div>

                    {/* Ticket Title */}
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                        <span style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>
                            APPOINTMENT QUEUE TICKET
                        </span>
                    </div>

                    {/* Queue Ticket Number Section */}
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '2px dashed black',
                        borderRadius: '4px',
                        padding: '10px',
                        background: '#f8fafc',
                        margin: '5px 0'
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: 950, fontFamily: 'monospace', letterSpacing: '-0.03em', color: 'black' }}>
                            {queueNumber}
                        </span>
                        
                        {isPriority && (
                            <div style={{ 
                                marginTop: '4px', 
                                background: 'black', 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: '9999px',
                                fontSize: '8px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                ♿ PRIORITY LANE
                            </div>
                        )}

                        <span style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginTop: '6px' }}>
                            {serviceName}
                        </span>
                    </div>

                    {/* Appointment Details Details */}
                    <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Applicant:</span>
                            <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{residentName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date:</span>
                            <span style={{ fontWeight: 900 }}>{appointmentDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Schedule Session:</span>
                            <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{appointmentSlot}</span>
                        </div>
                    </div>

                    {/* Barcode Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0 5px 0' }}>
                        <div style={{ width: '100%', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${queueNumber}`}
                                alt="Barcode Scannable Ticket"
                                style={{ height: '32px', width: '32px' }}
                            />
                        </div>
                        <span style={{ fontSize: '6px', fontFamily: 'monospace', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                            SCAN TO IDENTIFY TRANSACTION RECORD
                        </span>
                    </div>

                    {/* Notes Footer */}
                    <div style={{ borderTop: '2px solid black', paddingTop: '6px', textAlign: 'center' }}>
                        <p style={{ fontSize: '5.5px', fontWeight: 700, lineHeight: 1.3, color: '#475569', margin: 0 }}>
                            * Present this ticket at the municipal office treasury counter.<br/>
                            * Arrive at least 15 minutes before your schedule shift.<br/>
                            * Bring your required physical documents and valid ID.
                        </p>
                    </div>
                </div>
            </div>
        </>
    , document.body);
}
