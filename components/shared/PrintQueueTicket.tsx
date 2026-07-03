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
    residentName,
    serviceName,
    appointmentDate,
    appointmentSlot,
    isPriority = false,
    department,
    dateGenerated = new Date(),
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

    // Resolve department default if not specified
    const resolvedDepartment = department || (serviceName.toLowerCase().includes("cedula") ? "Treasury" : "Engineering");

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
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        lineHeight: 1.3,
                        color: 'black',
                        background: 'white',
                        padding: '16px',
                        textAlign: 'center'
                    }}
                >
                    {/* Header */}
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'none' }}>
                        Your Ticket Number is
                    </div>

                    {/* Thick line */}
                    <div style={{ borderTop: '3px solid black', margin: '4px 0 8px 0' }}></div>

                    {/* Big Queue Number */}
                    <div style={{ fontSize: '38px', fontWeight: '900', margin: '8px 0', letterSpacing: '1px' }}>
                        {queueNumber}
                    </div>

                    {/* Thick line */}
                    <div style={{ borderTop: '3px solid black', margin: '8px 0 12px 0' }}></div>

                    {/* Service Name */}
                    <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'none' }}>
                        &lt;{serviceName}&gt;
                    </div>

                    {/* Meta Details */}
                    <div style={{ textAlign: 'left', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'normal' }}>Date of Appointment:</span>
                            <span style={{ fontWeight: 'bold' }}>{formatDate(appointmentDate)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'normal' }}>Time of Appointment:</span>
                            <span style={{ fontWeight: 'bold' }}>{appointmentSlot}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'normal' }}>Department:</span>
                            <span style={{ fontWeight: 'bold' }}>{resolvedDepartment}</span>
                        </div>
                    </div>

                    {/* Date Generated */}
                    <div style={{ textAlign: 'left', fontSize: '11px', marginBottom: '22px' }}>
                        <span>Date and Time Generated:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>{formatDateTime(dateGenerated)}</span>
                    </div>

                    {/* Call to Actions / Waiting instructions */}
                    <div style={{ fontSize: '10px', lineHeight: 1.4, marginBottom: '20px', textAlign: 'center' }}>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Please wait for your number to be called.</p>
                        <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', fontSize: '9px', color: '#333' }}>
                            (Mangyaring hintayin na tawagin ang inyong numero.)
                        </p>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Please have your documents ready.</p>
                        <p style={{ margin: '0', fontStyle: 'italic', fontSize: '9px', color: '#333' }}>
                            (Ihanda ang inyong mga kinakailangang dokumento.)
                        </p>
                    </div>

                    {/* QR Code */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${queueNumber}`}
                            alt="QR Code"
                            style={{ width: '110px', height: '110px' }}
                            onLoad={() => setQrLoaded(true)}
                        />
                    </div>
                </div>
            </div>
        </>
    , document.body);
}
