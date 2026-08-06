"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PrintReferralSlipProps {
    controlNumber: string;
    patientId?: string;
    patientName: string;
    gender?: string;
    dateOfBirth?: string;
    barangay?: string;
    contactNumber?: string;
    philhealthNumber?: string;
    
    // Facility Info
    referringFacility: string;
    destinationFacility: string;
    referredAt?: string | Date;

    // Clinical Info
    checkupType?: string;
    symptoms?: string;
    vitals?: {
        height?: string;
        weight?: string;
        bmi?: string;
        bloodPressure?: string;
        temperature?: string;
        pulseRate?: string;
    };
    clinicalDiagnosis?: string;
    examinationFindings?: string;
    reasonForReferral?: string;
    attendingPhysician?: string;

    triggerPrint?: boolean;
    onPrintCompleted?: () => void;
}

const formatDate = (dateVal?: string | Date | null): string => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
};

const formatDateTime = (dateVal?: string | Date | null): string => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
};

export default function PrintReferralSlip({
    controlNumber,
    patientId,
    patientName,
    gender = "N/A",
    dateOfBirth,
    barangay = "N/A",
    contactNumber = "N/A",
    philhealthNumber,
    referringFacility,
    destinationFacility,
    referredAt = new Date(),
    checkupType,
    symptoms,
    vitals,
    clinicalDiagnosis,
    examinationFindings,
    reasonForReferral,
    attendingPhysician,
    triggerPrint = false,
    onPrintCompleted
}: PrintReferralSlipProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && triggerPrint) {
            const timer = setTimeout(() => {
                window.print();
                if (onPrintCompleted) onPrintCompleted();
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [mounted, triggerPrint, onPrintCompleted]);

    if (!mounted) return null;

    const displayTimestamp = formatDateTime(referredAt);

    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 12mm; 
                    }
                    body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                        color: black !important;
                        font-family: Arial, Helvetica, sans-serif !important;
                    }
                    body > * { 
                        display: none !important; 
                    }
                    #referral-slip-print-portal {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        visibility: visible !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 999999 !important;
                        color: black !important;
                    }
                    #referral-slip-print-portal * {
                        visibility: visible !important;
                        color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            <div
                id="referral-slip-print-portal"
                className="hidden print:block"
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '210mm',
                    background: 'white',
                    color: 'black',
                    fontFamily: 'Arial, sans-serif'
                }}
            >
                <div className="p-8 max-w-[210mm] mx-auto border-4 border-slate-900 bg-white text-slate-900">
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 relative">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Republic of the Philippines</p>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Province of Pangasinan • Municipality of Mapandan</p>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">RURAL HEALTH UNIT</h1>
                        <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mt-2">
                            Official Patient Medical Referral Slip
                        </div>
                        
                        {/* Control & Date Badge */}
                        <div className="mt-3 flex justify-between items-center text-[11px] font-mono font-bold border-t border-slate-200 pt-2 text-slate-700">
                            <span>REFERRAL CONTROL NO: <strong className="text-black">{controlNumber}</strong></span>
                            <span>DATE & TIME: <strong className="text-black">{displayTimestamp}</strong></span>
                        </div>
                    </div>

                    {/* Facility Transfer Row */}
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-100 border border-slate-300 rounded-xl">
                        <div className="border-r border-slate-300 pr-4">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Referring Facility (Origin)</p>
                            <p className="text-sm font-black text-slate-900 uppercase mt-0.5">{referringFacility || "Mapandan Rural Health Unit"}</p>
                            <p className="text-[10px] font-semibold text-slate-600 mt-0.5">Mapandan, Pangasinan</p>
                        </div>
                        <div className="pl-2">
                            <p className="text-[10px] font-black uppercase text-fuchsia-700 tracking-wider">Destination Facility (Referral Target)</p>
                            <p className="text-sm font-black text-fuchsia-900 uppercase mt-0.5">{destinationFacility || "N/A"}</p>
                            <p className="text-[10px] font-semibold text-slate-600 mt-0.5">External Medical Referral Center</p>
                        </div>
                    </div>

                    {/* Patient Particulars */}
                    <div className="mb-6">
                        <div className="bg-slate-800 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded-t-lg">
                            I. Patient Information
                        </div>
                        <div className="border border-slate-300 border-t-0 rounded-b-lg p-4 grid grid-cols-3 gap-y-3 gap-x-4 text-xs">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Patient Name:</span>
                                <strong className="text-slate-900 font-black uppercase text-sm">{patientName}</strong>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Patient / Ref Control ID:</span>
                                <strong className="text-slate-900 font-mono font-bold">{patientId || controlNumber}</strong>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Gender / Sex:</span>
                                <strong className="text-slate-900 font-bold uppercase">{gender}</strong>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Date of Birth:</span>
                                <strong className="text-slate-900 font-bold">{dateOfBirth ? formatDate(dateOfBirth) : "N/A"}</strong>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Barangay Address:</span>
                                <strong className="text-slate-900 font-bold uppercase">{barangay}</strong>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Contact Number:</span>
                                <strong className="text-slate-900 font-bold">{contactNumber}</strong>
                            </div>
                            {philhealthNumber && (
                                <div className="col-span-3 border-t border-slate-200 pt-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">PhilHealth / Konsulta ID:</span>
                                    <strong className="text-slate-900 font-mono">{philhealthNumber}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vitals Summary (If Available) */}
                    {vitals && (vitals.bloodPressure || vitals.temperature || vitals.pulseRate || vitals.weight) && (
                        <div className="mb-6">
                            <div className="bg-slate-800 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded-t-lg">
                                II. Clinical Vitals at Transfer
                            </div>
                            <div className="border border-slate-300 border-t-0 rounded-b-lg p-3 grid grid-cols-4 gap-2 text-xs text-center">
                                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Blood Pressure</span>
                                    <strong className="text-slate-900 font-black">{vitals.bloodPressure || "N/A"}</strong>
                                </div>
                                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Body Temp</span>
                                    <strong className="text-slate-900 font-black">{vitals.temperature ? `${vitals.temperature} °C` : "N/A"}</strong>
                                </div>
                                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Pulse Rate</span>
                                    <strong className="text-slate-900 font-black">{vitals.pulseRate ? `${vitals.pulseRate} bpm` : "N/A"}</strong>
                                </div>
                                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Height / Weight</span>
                                    <strong className="text-slate-900 font-black">{vitals.height ? `${vitals.height}cm` : ""}{vitals.weight ? ` / ${vitals.weight}kg` : "N/A"}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clinical Summary & Reason for Referral */}
                    <div className="mb-6 space-y-4">
                        <div className="bg-slate-800 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded-t-lg">
                            III. Clinical Findings & Reason for Transfer
                        </div>
                        <div className="border border-slate-300 border-t-0 rounded-b-lg p-4 space-y-3 text-xs">
                            
                            {/* Consultation Category / Chief Complaints */}
                            <div>
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Type of Consultation / Chief Complaints:</span>
                                <p className="font-bold text-slate-900 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    {checkupType || "General Medical Check-up"} {symptoms ? `— ${symptoms}` : ""}
                                </p>
                            </div>

                            {/* Clinical Diagnosis */}
                            <div>
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Clinical Diagnosis / Impressions:</span>
                                <p className="font-bold text-slate-900 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    {clinicalDiagnosis || examinationFindings || "Specialty Medical Evaluation Required"}
                                </p>
                            </div>

                            {/* Reason for Transfer */}
                            <div>
                                <span className="block text-[10px] font-black text-fuchsia-800 uppercase tracking-wider">Reason for Transfer / Referral:</span>
                                <p className="font-black text-slate-900 mt-0.5 bg-fuchsia-50 p-3 rounded-lg border border-fuchsia-200 text-sm">
                                    {reasonForReferral || "For specialized evaluation, diagnostic workup, and higher-level clinical care."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-10 pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
                        <div>
                            <div className="h-12 flex items-end justify-center">
                                <p className="font-black uppercase text-sm text-slate-900">{attendingPhysician || "Attending Medical Officer"}</p>
                            </div>
                            <div className="border-t border-slate-800 pt-1">
                                <p className="font-bold text-[10px] uppercase text-slate-600">Referring Physician / Healthcare Personnel</p>
                                <p className="text-[9px] text-slate-500 font-mono">License / Staff Reg No: ______________</p>
                            </div>
                        </div>
                        <div>
                            <div className="h-12 flex items-end justify-center">
                                <p className="font-black uppercase text-xs text-slate-500">[ OFFICIAL RHU SEAL / STAMP ]</p>
                            </div>
                            <div className="border-t border-slate-800 pt-1">
                                <p className="font-bold text-[10px] uppercase text-slate-600">RHU Station Official Stamp & Date Received</p>
                                <p className="text-[9px] text-slate-500">Mapandan Municipal Health Office</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center text-[9px] text-slate-500 border-t border-slate-200 pt-2 font-mono">
                        Generated automatically via EMapandan Health Control System • Timestamp: {displayTimestamp} • Document ID: {controlNumber}
                    </div>
                </div>
            </div>
        </>
    , document.body);
}
