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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        if (mounted && triggerPrint) {
            if (qrLoaded) {
                const timer = setTimeout(() => {
                    window.print();
                    if (onPrintCompleted) onPrintCompleted();
                }, 150);
                return () => clearTimeout(timer);
            } else {
                // Fallback timeout in case image loading fails or takes too long
                const fallback = setTimeout(() => {
                    window.print();
                    if (onPrintCompleted) onPrintCompleted();
                }, 1500);
                return () => clearTimeout(fallback);
            }
        }
    }, [mounted, triggerPrint, qrLoaded, queueNumber, onPrintCompleted]);

    if (!mounted) return null;



    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        size: 80mm 150mm; 
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
                        padding: 6mm !important;
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
                        fontFamily: 'Courier New, Courier, monospace',
                        lineHeight: 1.35,
                        color: 'black',
                        background: 'white',
                        padding: '24px 20px',
                        border: '2.5px solid black',
                        borderRadius: '24px',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        width: '100%',
                    }}
                >
                    {/* Official LGU Logo & Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            border: '2px solid black',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            marginBottom: '8px',
                            fontFamily: 'Courier New, Courier, monospace',
                        }}>
                            LGU
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Courier New, Courier, monospace' }}>
                            Republic of the Philippines
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px', fontFamily: 'Courier New, Courier, monospace' }}>
                            Municipality of Mapandan
                        </span>
                        <span style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '1px', fontFamily: 'Courier New, Courier, monospace' }}>
                            Province of Pangasinan
                        </span>
                        <div style={{
                            border: '1.2px solid black',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            marginTop: '6px',
                            display: 'inline-block',
                            fontWeight: 'bold',
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontFamily: 'Courier New, Courier, monospace'
                        }}>
                            EMapandan Rural Health Unit
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div style={{ borderTop: '2px dashed black', margin: '12px 0' }}></div>

                    {/* Ticket Number Section */}
                    <div style={{ padding: '2px 0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontFamily: 'Courier New, Courier, monospace' }}>
                            Queue Ticket Number
                        </span>
                        <div style={{ 
                            border: '2px dashed black', 
                            padding: '12px 6px', 
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent'
                        }}>
                            <span style={{ 
                                fontSize: '24px', 
                                fontWeight: '900', 
                                letterSpacing: '0.5px',
                                fontFamily: 'Courier New, Courier, monospace',
                                display: 'block'
                            }}>
                                {queueNumber}
                            </span>
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div style={{ borderTop: '2px dashed black', margin: '12px 0' }}></div>

                    {/* Transaction Details */}
                    <div style={{ fontSize: '10.5px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', margin: '2px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 'normal', fontFamily: 'Courier New, Courier, monospace', flexShrink: 0 }}>Service Type:</span>
                            <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '65%', fontFamily: 'Courier New, Courier, monospace', wordBreak: 'break-word' }}>{serviceName}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed #777', margin: '6px 0' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'normal', fontFamily: 'Courier New, Courier, monospace' }}>Date:</span>
                            <span style={{ fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace' }}>{formatDate(appointmentDate)}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed #777', margin: '6px 0' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'normal', fontFamily: 'Courier New, Courier, monospace' }}>Schedule:</span>
                            <span style={{ fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace' }}>{appointmentSlot}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed #777', margin: '6px 0' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'normal', fontFamily: 'Courier New, Courier, monospace' }}>Created On:</span>
                            <span style={{ fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace' }}>{formatDateTime(dateGenerated)}</span>
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div style={{ borderTop: '2px dashed black', margin: '12px 0' }}></div>


                    {/* QR Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', margin: '8px 0' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${queueNumber}`}
                            alt="QR Code"
                            style={{ width: '100px', height: '100px', border: '1.5px solid black', padding: '4px', borderRadius: '4px', background: 'white' }}
                            onLoad={() => setQrLoaded(true)}
                        />
                        <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: 'black', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Courier New, Courier, monospace' }}>
                            Scan QR Code at Counter
                        </span>
                    </div>

                    {/* Dashed Divider */}
                    <div style={{ borderTop: '2px dashed black', margin: '12px 0' }}></div>

                    {/* Footer Slogan */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Courier New, Courier, monospace' }}>
                        Serbisyong Tapat at Totoo
                    </div>
                    <div style={{ fontSize: '8px', color: '#555', marginTop: '2px', fontFamily: 'Courier New, Courier, monospace' }}>
                        Mapandan, Pangasinan
                    </div>
                </div>
            </div>
        </>
    , document.body);
}
