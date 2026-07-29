"use client";

import React, { useRef, useState, useEffect } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { QrCode, X, AlertCircle } from "lucide-react";

interface PosoQrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

export default function PosoQrScannerModal({
    isOpen,
    onClose,
    onScanSuccess,
}: PosoQrScannerModalProps) {
    const [cameraError, setCameraError] = useState<string | null>(null);
    const isHandlingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            isHandlingRef.current = false;
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase italic tracking-tight text-white">
                                Live POSO Ticket QR Scanner
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium italic">
                                Automatic Citation Ticket Verification
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Camera Viewport Container */}
                <div className="relative rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden min-h-[280px] flex flex-col items-center justify-center">
                    {!cameraError ? (
                        <BarcodeScannerComponent
                            width="100%"
                            height={280}
                            videoConstraints={{
                                facingMode: "environment",
                                width: { ideal: 1920 },
                                height: { ideal: 1080 },
                            }}
                            onUpdate={(err, result) => {
                                if (result && result.getText()) {
                                    const text = result.getText().trim();
                                    if (text && !isHandlingRef.current) {
                                        isHandlingRef.current = true;
                                        onScanSuccess(text);
                                    }
                                } else if (err && typeof err === "string" && !err.includes("NotFoundException")) {
                                    setCameraError(err);
                                }
                            }}
                        />
                    ) : (
                        <div className="p-6 text-center space-y-3 max-w-xs z-20">
                            <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 w-fit mx-auto border border-rose-500/20">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <p className="text-xs text-slate-300 italic leading-relaxed">
                                {cameraError}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Guidance Note */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                    <p className="text-xs text-slate-300 italic font-medium">
                        Position the printed QR Code on your ticket inside the camera box to scan automatically.
                    </p>
                </div>
            </div>
        </div>
    );
}
