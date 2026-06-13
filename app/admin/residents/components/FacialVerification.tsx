"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import { CheckCircle2, Circle, Loader2, RefreshCw, ShieldAlert, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useResident } from "../providers";

// SILENCE MEDIAPIPE INFO LOGS (Next.js Dev Overlay Fix)
if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args) => {
        if (args[0]?.includes?.("Created TensorFlow Lite XNNPACK delegate")) return;
        originalError.apply(console, args);
    };
}

// IMPORT MEDIAPIPE VIA LOCAL MODULE
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface FacialVerificationProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (descriptor: number[]) => void; 
}

type VerificationStep = "INITIALIZING" | "NEUTRAL" | "BLINK" | "LOOK_LEFT" | "LOOK_RIGHT" | "COMPLETED" | "PROCESSING";

interface MPPoint { x: number; y: number; z?: number }

export function FacialVerification({ isOpen, onClose, onVerified }: FacialVerificationProps) {
    const { themeColor } = useResident();
    const webcamRef = useRef<Webcam>(null);
    const [step, setStep] = useState<VerificationStep>("INITIALIZING");
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [hint, setHint] = useState<string>("Face the camera");
    const [showGuide, setShowGuide] = useState(false); 
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const isProcessing = useRef(false);
    const baselineEAR = useRef(0);
    const baselineFrames = useRef(0);
    const blinkFrameCounter = useRef(0);
    const eyeWasClosed = useRef(false);
    const [isCameraSupported, setIsCameraSupported] = useState<boolean | null>(null);

    useEffect(() => {
        setIsCameraSupported(
            typeof window !== "undefined" && 
            !!navigator?.mediaDevices?.getUserMedia
        );
    }, []);

    // Liveness Detection State
    const [liveness, setLiveness] = useState({
        neutral: false,
        left: false,
        right: false,
        blink: false
    });

    // Load Models (Hybrid)
    useEffect(() => {
        const loadModels = async () => {
            try {
                if (isCameraSupported === false) return;
                console.log("Loading AI Vision Engines...");
                const MODEL_URL = "/models";
                
                // 1. Load face-api (for final descriptor only)
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                // 2. Load Mediapipe (for High-Accuracy live tracking)
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });

                setModelsLoaded(true);
                setStep("NEUTRAL");
            } catch (err) {
                console.error("Error loading models:", err);
                setHint("Fail to start engines.");
            }
        };

        if (isOpen && !modelsLoaded && isCameraSupported !== null) {
            loadModels();
        }
    }, [isOpen, modelsLoaded, isCameraSupported]);

    const resetVerification = useCallback(() => {
        setStep("NEUTRAL");
        setLiveness({ neutral: false, left: false, right: false, blink: false });
        setHint("Face the camera");
        isProcessing.current = false;
        baselineEAR.current = 0;
        baselineFrames.current = 0;
        blinkFrameCounter.current = 0;
        eyeWasClosed.current = false;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetVerification();
        }
    }, [isOpen, resetVerification]);

    // MEDIAPIPE EAR CALCULATOR (High Precision)
    const getMediapipeEAR = (landmarks: MPPoint[]) => {
        // Indices derived from Mediapipe 468 points model
        // Left Eye: 33, 160, 158, 133, 153, 144
        const euclideanMP = (p1: MPPoint, p2: MPPoint) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        
        // Indices for vertical and horizontal measurements (Mediapipe model)
        const v1 = euclideanMP(landmarks[160], landmarks[144]);
        const v2 = euclideanMP(landmarks[158], landmarks[153]);
        const h = euclideanMP(landmarks[33], landmarks[133]);
        return (v1 + v2) / (2.0 * h);
    };

    const handleVerification = useCallback(async () => {
        if (isCameraSupported === false) return;
        if (!webcamRef.current || !webcamRef.current.video || !modelsLoaded || !faceLandmarkerRef.current) return;
        if (isProcessing.current || step === "COMPLETED" || step === "PROCESSING" || showGuide) return;

        isProcessing.current = true;
        
        try {
            const video = webcamRef.current.video;
            if (video.readyState < 2) {
                isProcessing.current = false;
                return;
            }

            // MEDIAPIPE PRECISION TRACKING
            const startTimeMs = performance.now();
            const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

            if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
                setHint("Align your face clearly...");
                isProcessing.current = false;
                return;
            }

            const landmarks = results.faceLandmarks[0];
            
            // 1. NEUTRAL CHECK
            if (!liveness.neutral) {
                // Check if nose bridge (point 1) is roughly centered in frame
                const noseBridge = landmarks[1];
                if (Math.abs(noseBridge.x - 0.5) < 0.1 && Math.abs(noseBridge.y - 0.5) < 0.15) {
                    setLiveness(prev => ({ ...prev, neutral: true }));
                    setStep("BLINK");
                } else {
                    setHint("Center your face in the frame.");
                }
                isProcessing.current = false;
                return;
            }

            // 2. BLINK DETECTION (Mediapipe 468 Accuracy)
            if (liveness.neutral && !liveness.blink) {
                const ear = getMediapipeEAR(landmarks);
                
                // Adaptive Baseline (First 6 frames)
                if (baselineFrames.current < 6) {
                    baselineEAR.current += ear;
                    baselineFrames.current++;
                    setHint(`Calibrating AI... ${baselineFrames.current}/6`);
                    isProcessing.current = false;
                    return;
                }
                if (baselineFrames.current === 6) {
                    baselineEAR.current = baselineEAR.current / 6;
                    baselineFrames.current = 7;
                }

                // High Sensitivity threshold (0.65 for Mediapipe is solid)
                const threshold = baselineEAR.current * 0.65;

                if (ear < threshold) {
                    blinkFrameCounter.current++;
                    eyeWasClosed.current = true;
                    setHint("Eyes closed... now OPEN!");
                } else {
                    if (eyeWasClosed.current && blinkFrameCounter.current >= 1) {
                        setLiveness(prev => ({ ...prev, blink: true }));
                        setStep("LOOK_LEFT");
                    } else {
                        blinkFrameCounter.current = 0;
                        eyeWasClosed.current = false;
                        setHint("Blink your eyes naturally now.");
                    }
                }
                isProcessing.current = false;
                return;
            }

            // 3. LOOK LEFT
            if (liveness.blink && !liveness.left) {
                // Mediapipe X coordinates are 0-1. 0 is Left, 1 is Right in mirrored view.
                // If nose tip (point 1) moves significantly to the mirrored right side (user's actual left)
                const noseTip = landmarks[1];
                if (noseTip.x > 0.62) {
                    setLiveness(prev => ({ ...prev, left: true }));
                    setStep("LOOK_RIGHT");
                } else {
                    setHint("Turn head slightly LEFT...");
                }
                isProcessing.current = false;
                return;
            }

            // 4. LOOK RIGHT & FINAL EXTRACTION
            if (liveness.left && !liveness.right) {
                const noseTip = landmarks[1];
                if (noseTip.x < 0.38) {
                    setLiveness(prev => ({ ...prev, right: true }));
                    setHint("Verified! Finalizing biometrics...");
                    setStep("PROCESSING");

                    // FINAL EXTRACTION (face-api.js 128-d Descriptor)
                    let fullDetections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 })).withFaceLandmarks().withFaceDescriptor();
                    
                    // Fallback retry with higher size and lower threshold if the first one misses
                    if (!fullDetections) {
                         fullDetections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.1 })).withFaceLandmarks().withFaceDescriptor();
                    }

                    if (!fullDetections) {
                        toast.error("Extraction fail. Make sure there is enough lighting so your face is clear.");
                        resetVerification();
                        return;
                    }

                    const descriptor = Array.from(fullDetections.descriptor);
                    
                    toast.success("Identity Secured!");
                    setStep("COMPLETED");
                    onVerified(descriptor);
                } else {
                    setHint("Turn head slightly RIGHT...");
                }
                isProcessing.current = false;
                return;
            }

        } catch (err) {
            console.error("Vision Error:", err);
        } finally {
            isProcessing.current = false;
        }
    }, [modelsLoaded, step, liveness, showGuide, onVerified, resetVerification, isCameraSupported]);

    // Interval Management (Ultra-Fast for Mediapipe)
    const handleRef = useRef(handleVerification);
    useEffect(() => { handleRef.current = handleVerification; }, [handleVerification]);

    useEffect(() => {
        if (isCameraSupported === false) return;
        if (!isOpen || !modelsLoaded || ["COMPLETED", "INITIALIZING", "PROCESSING"].includes(step) || showGuide) return;
        
        const speed = step === "BLINK" ? 30 : 100; // Ultra-fast 30ms for Mediapipe!
        const interval = setInterval(() => handleRef.current(), speed);
        return () => clearInterval(interval);
    }, [isOpen, modelsLoaded, step, showGuide, isCameraSupported]);

    const handleWebcamError = (err: string | DOMException) => {
        console.error("Webcam:", err);
        setHint("Camera permission fail.");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#0f1117] border-white/10 rounded-3xl shadow-2xl">
                <DialogHeader className="p-6 bg-[#1a1f2e] border-b border-white/5">
                    <DialogTitle className="text-lg font-black italic uppercase tracking-tighter text-white flex items-center justify-between">
                        <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Bio-Metric v2.0</span>
                        {step === "COMPLETED" && <CheckCircle2 className="w-6 h-6 text-green-500 animate-bounce" />}
                    </DialogTitle>
                    <DialogDescription className="sr-only">High-speed Mediapipe verification.</DialogDescription>
                </DialogHeader>

                <div className="relative aspect-square flex items-center justify-center bg-black overflow-hidden group">
                    {showGuide && isCameraSupported !== false && (
                        <div className="absolute inset-0 z-50 bg-[#0f1117] p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                            <ShieldAlert className="w-16 h-16 mb-6" style={{ color: themeColor }} />
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Pro-Level Scan</h2>
                            <p className="text-slate-400 text-sm font-medium mb-8 max-w-xs">Using Google&apos;s Mediapipe Elite engine for 100% accuracy.</p>
                            <Button 
                                onClick={() => setShowGuide(false)} 
                                style={{ backgroundColor: themeColor }}
                                className="w-full h-12 rounded-2xl hover:opacity-90 text-white font-black uppercase italic transition-all duration-200"
                            >
                                I AM READY
                            </Button>
                        </div>
                    )}

                    {isCameraSupported === false ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-rose-500 bg-rose-500/10 h-full w-full gap-4">
                            <ShieldAlert className="w-12 h-12 shrink-0 animate-pulse animate-pulse" />
                            <p className="font-bold uppercase tracking-widest text-xs">Camera Access Not Supported</p>
                            <p className="text-[10px] text-slate-400 italic max-w-xs leading-relaxed">
                                Your browser does not support webcam access, or this site is not using a secure connection (HTTPS/localhost).
                            </p>
                        </div>
                    ) : modelsLoaded ? (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className={`w-full h-full object-cover transition-all duration-700 ${step === "INITIALIZING" || showGuide ? 'grayscale opacity-40' : 'grayscale-0 opacity-100'}`}
                                videoConstraints={{ facingMode: "user", width: 720, height: 720 }}
                                mirrored={true}
                                onUserMediaError={handleWebcamError}
                            />
                            {/* Face Guideline Oval */}
                            <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ border: '10px solid transparent', borderColor: step === "COMPLETED" ? 'rgba(34, 197, 94, 0.5)' : `${themeColor}1a` }}>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-white/30 rounded-[100px]">
                                    {step !== "COMPLETED" && (
                                        <div 
                                            style={{ borderColor: `${themeColor}80` }}
                                            className="absolute inset-0 border-2 border-dashed rounded-[100px] animate-pulse" 
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin" style={{ color: themeColor }} />
                            <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">Igniting Mediapipe Engine...</p>
                        </div>
                    )}

                    {!showGuide && isCameraSupported !== false && (
                        <div className="absolute bottom-6 left-6 right-6 p-4 bg-transparent flex flex-col items-center animate-in slide-in-from-bottom-4">
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 font-mono" style={{ color: themeColor }}>NEURAL STATUS: OK</span>
                            <h3 className="text-white text-lg font-black uppercase italic tracking-tighter text-center">
                                {step === "NEUTRAL" && "Center your high-def face"}
                                {step === "BLINK" && "Give us a snappy BLINK"}
                                {step === "LOOK_LEFT" && "Turn head slightly LEFT"}
                                {step === "LOOK_RIGHT" && "Turn head slightly RIGHT"}
                                {step === "PROCESSING" && "Neural Analysis..."}
                                {step === "COMPLETED" && "Biometrics Secured!"}
                            </h3>
                            <p className="mt-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                 {hint}
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-[#1a1f2e] space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <CheckItem label="Center" active={liveness.neutral} />
                        <CheckItem label="Blink" active={liveness.blink} />
                        <CheckItem label="Left" active={liveness.left} />
                        <CheckItem label="Right" active={liveness.right} />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold hover:bg-white/10">Cancel</Button>
                        <Button 
                            onClick={resetVerification} 
                            style={{ backgroundColor: themeColor }}
                            className="flex-1 h-12 rounded-xl hover:opacity-90 text-white font-bold flex items-center gap-2 transition-all duration-200"
                        >
                            <RefreshCw className="w-4 h-4" /> Hard Reset
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CheckItem({ label, active }: { label: string, active: boolean }) {
    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-500 ${active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>
            {active ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
        </div>
    );
}
