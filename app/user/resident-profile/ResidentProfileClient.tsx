"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, MapPin, Phone, Briefcase, Shield,
    Users, FileText, Printer, Edit,
    X, ZoomIn, ZoomOut, RotateCw, RefreshCw,
    Activity, Clock, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { getSecureUploadUrlAction } from "@/app/auth/actions";
import { updateResidentProfileImage } from "./actions";



interface ResidentProfileClientProps {
    resident: any;
    themeColor?: string;
}

export default function ResidentProfileClient({ resident, themeColor = "#2563eb" }: ResidentProfileClientProps) {
    const [activeTab, setActiveTab] = useState<"personal" | "address" | "socio" | "gov" | "system">("personal");
    const [zoomedImage, setZoomedImage] = useState<{ src: string; label: string } | null>(null);
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [profileImage, setProfileImage] = useState(resident?.livenessUrl || resident?.imageUrl || "");

    // Crop state variables
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState("");
    const [cropScale, setCropScale] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [dragStartCrop, setDragStartCrop] = useState({ x: 0, y: 0 });

    const viewportRef = React.useRef<HTMLDivElement>(null);
    const imageRef = React.useRef<HTMLImageElement>(null);
    const cutoutRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (resident) {
            setProfileImage(resident.livenessUrl || resident.imageUrl || "");
        }
    }, [resident]);

    const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImageSrc(reader.result as string);
            setCropScale(1);
            setCropOffset({ x: 0, y: 0 });
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        
        e.target.value = "";
    };

    const handleMouseDownCrop = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingCrop(true);
        setDragStartCrop({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
    };

    const handleMouseMoveCrop = (e: React.MouseEvent) => {
        if (!isDraggingCrop) return;
        e.preventDefault();
        setCropOffset({
            x: e.clientX - dragStartCrop.x,
            y: e.clientY - dragStartCrop.y
        });
    };

    const handleMouseUpCrop = () => {
        setIsDraggingCrop(false);
    };


    const handleTouchStartCrop = (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        setIsDraggingCrop(true);
        setDragStartCrop({ x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y });
    };

    const handleTouchMoveCrop = (e: React.TouchEvent) => {
        if (!isDraggingCrop || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setCropOffset({
            x: touch.clientX - dragStartCrop.x,
            y: touch.clientY - dragStartCrop.y
        });
    };

    const uploadCroppedPhoto = async (file: File) => {
        const toastId = toast.loading("Uploading cropped profile photo...");

        try {
            const fileExt = "jpg";
            const uploadRes = await getSecureUploadUrlAction("profile_image", "resident_profile", fileExt);
            if (!uploadRes.success || !uploadRes.signedUrl || !uploadRes.publicUrl) {
                throw new Error(uploadRes.error || "Failed to generate secure upload destination");
            }

            const putRes = await fetch(uploadRes.signedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type
                },
                body: file
            });

            if (!putRes.ok) {
                throw new Error(`Upload failed: ${putRes.statusText}`);
            }

            const dbRes = await updateResidentProfileImage(uploadRes.publicUrl);
            if (!dbRes.success) {
                throw new Error(dbRes.error || "Failed to save profile photo link");
            }

            setProfileImage(uploadRes.publicUrl);
            toast.success("Profile photo updated successfully!", { id: toastId });
        } catch (error: any) {
            console.error("Profile photo update error:", error);
            toast.error(error.message || "Failed to update profile photo", { id: toastId });
        }
    };

    const handleCropSave = () => {
        if (!viewportRef.current || !imageRef.current || !cutoutRef.current || !selectedImageSrc) return;

        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const cutoutRect = cutoutRef.current!.getBoundingClientRect();
            const imageRect = imageRef.current!.getBoundingClientRect();

            const scaleX = img.naturalWidth / imageRect.width;
            const scaleY = img.naturalHeight / imageRect.height;

            const sx = (cutoutRect.left - imageRect.left) * scaleX;
            const sy = (cutoutRect.top - imageRect.top) * scaleY;
            const sw = cutoutRect.width * scaleX;
            const sh = cutoutRect.height * scaleY;

            canvas.width = 400;
            canvas.height = 400;

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 400);

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error("Failed to crop image");
                    return;
                }

                setCropModalOpen(false);
                const croppedFile = new File([blob], "profile_cropped.jpg", { type: "image/jpeg" });
                await uploadCroppedPhoto(croppedFile);
            }, "image/jpeg", 0.9);
        };
        img.src = selectedImageSrc;
    };


    const openLightbox = (src: string, label: string) => {
        setZoomedImage({ src, label });
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
    };

    const handleReset = () => {
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale === 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setZoomedImage(null);
        };
        if (zoomedImage) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [zoomedImage]);

    if (!resident) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500">
                    <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-slate-800 dark:text-white">No Profile Linked</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-md uppercase tracking-tight leading-relaxed italic">
                    This account is not currently linked to a verified resident record. If you are a resident, please proceed to the registration portal or visit the Municipal Hall.
                </p>
            </div>
        );
    }

    const calculateAge = (dob: Date | string) => {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} years old`;
    };

    const formatFullAddress = (res: any) => {
        const parts = [
            res.houseNumber ? `No. ${res.houseNumber}` : "",
            res.street ? `${res.street}` : "",
            res.purok ? `Purok ${res.purok}` : "",
            res.sitio ? `(${res.sitio})` : "",
            res.barangay ? `Brgy. ${res.barangay}` : "",
            res.municipality || "Mapandan",
            res.province || "Pangasinan"
        ];
        return parts.filter(Boolean).join(", ");
    };

    const formatParentName = (first: string, middle: string, last: string) => {
        const parts = [last, first, middle ? `${middle[0]}.` : ""].filter(Boolean);
        return parts.join(", ") || "N/A";
    };

    // Formatted CUID/Unique ID
    const formattedId = `RES-${new Date(resident.createdAt).getFullYear()}-${resident.id.slice(-4).toUpperCase()}`;

    // Registration Status config
    const statusConfig = {
        APPROVED: { label: "APPROVED", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
        PENDING: { label: "PENDING", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
        REJECTED: { label: "REJECTED", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20", dot: "bg-red-500" },
        DRAFT: { label: "DRAFT", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20", dot: "bg-slate-400" },
    };

    const status = statusConfig[resident.registrationStatus as "APPROVED" | "PENDING" | "REJECTED" | "DRAFT"] || statusConfig.PENDING;



    return (
        <div className="space-y-6">
            {/* ── Dynamic print styles ── */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    header, footer, nav, button, .no-print {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-card {
                        border: none !important;
                        box-shadow: none !important;
                        background: none !important;
                        padding: 0 !important;
                    }
                    .print-grid {
                        display: grid !important;
                        grid-template-cols: repeat(2, 1fr) !important;
                        gap: 10px !important;
                    }
                    .print-section {
                        page-break-inside: avoid;
                        margin-bottom: 20px !important;
                    }
                }
            `}</style>

            {/* ── Status and ID Banner ── */}
            <div className={`flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border rounded-3xl shadow-sm gap-2 bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5`}>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Status:</span>
                    <span className={`text-xs font-black uppercase tracking-wider ${status.color}`}>
                        {status.label}
                    </span>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="text-slate-400">ID Number: </span>
                    <span className="font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">{formattedId}</span>
                </div>
            </div>

            {/* ── Profile Main Card ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-blue-500/10 to-transparent pointer-events-none rounded-full" />

                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
                    {/* Avatar Block */}
                    <div className="relative flex-shrink-0">
                        {/* Hidden file input */}
                        <input 
                            type="file" 
                            id="profile-photo-input"
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleProfilePhotoChange} 
                        />

                        {/* Avatar Button triggers file picker */}
                        <button
                            type="button"
                            onClick={() => document.getElementById("profile-photo-input")?.click()}
                            className="group relative w-36 h-36 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-lg block cursor-pointer"
                        >
                            {profileImage ? (
                                <>
                                    <Image
                                        src={profileImage}
                                        alt="Resident Photo"
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-1 z-10">
                                        <Edit className="w-5 h-5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Edit Photo</span>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <Edit className="w-12 h-12 stroke-[1.5]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">UPLOAD PHOTO</span>
                                </div>
                            )}
                        </button>

                        {/* Edit Profile Photo Button */}
                        <button 
                            type="button"
                            onClick={() => document.getElementById("profile-photo-input")?.click()}
                            className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 cursor-pointer z-20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" 
                            title="Edit Profile Photo"
                        >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                        </button>

                        {/* Zoom Button on top-right */}
                        {profileImage && (
                            <button
                                type="button"
                                onClick={() => openLightbox(profileImage, "Resident Portrait")}
                                className="absolute -top-1.5 -right-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 z-20 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                                title="View Full Photo"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        )}



                        {/* RFID Badge */}
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950 text-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md border border-white/10 z-10 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${resident.rfid ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                                {resident.rfid ? "RFID ACTIVE" : "RFID INACTIVE"}
                            </span>
                        </div>
                    </div>

                    {/* Middle Info Details */}
                    <div className="flex-1 text-center lg:text-left space-y-4">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
                            {resident.isHead && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-300">
                                    <Users className="w-3 h-3 text-teal-500" />
                                    Household Head
                                </div>
                            )}
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350">
                                {resident.civilStatus}
                            </div>
                            {resident.isSenior && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
                                    <Shield className="w-3 h-3 text-blue-500" />
                                    Senior Citizen
                                </div>
                            )}
                            {resident.isPWD && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300">
                                    PWD
                                </div>
                            )}
                            {resident.isSoloParent && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300">
                                    Solo Parent
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none">
                                {resident.lastName}, {resident.firstName} {resident.middleName ? `${resident.middleName}` : ""} {resident.suffix}
                            </h2>
                        </div>

                        {/* DOB, Age, Gender, Blood Type Row */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">DOB:</span>
                                <span className="text-slate-700 dark:text-slate-200 uppercase">{resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}</span>
                            </div>
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">Age:</span>
                                <span className="text-slate-700 dark:text-slate-200">{calculateAge(resident.dateOfBirth)}</span>
                            </div>
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">Gender:</span>
                                <span className="text-slate-700 dark:text-slate-200 uppercase">{resident.gender}</span>
                            </div>
                            {resident.bloodType && (
                                <>
                                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">Blood Type:</span>
                                        <span className="text-red-500 dark:text-red-400 font-extrabold">{resident.bloodType}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Full Residence Address Card */}
                        <div className="inline-flex items-start gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left w-full">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" style={{ color: themeColor }} />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Residence</span>
                                <span className="text-xs font-extrabold uppercase tracking-tight text-slate-800 dark:text-slate-200 leading-snug">
                                    {formatFullAddress(resident)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons (Right) */}
                    <div className="flex flex-row lg:flex-col items-center gap-2.5 w-full lg:w-auto shrink-0 no-print">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex-1 lg:w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-250 active:scale-95 text-white shadow-lg shadow-blue-500/20"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                        >
                            <Printer className="w-4 h-4" />
                            Print Official
                        </button>
                    </div>
                </div>
            </div>

            {/* ── tab select layout ── */}
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 no-print">
                {(["personal", "address", "socio", "gov", "system"] as const).map((tab) => {
                    const tabLabels = {
                        personal: { label: "Personal & Family", icon: User },
                        address: { label: "Address & Contact", icon: MapPin },
                        socio: { label: "Socio-Economic", icon: Briefcase },
                        gov: { label: "Government IDs", icon: Shield },
                        system: { label: "System & Review", icon: Activity },
                    };
                    const Icon = tabLabels[tab].icon;
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${isActive
                                ? "text-white shadow-md scale-[1.01]"
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 opacity-85"
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">{tabLabels[tab].label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab contents ── */}
            <div className="space-y-6">
                {activeTab === "personal" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <Section icon={User} title="Core Personal Records">
                            <Field label="Citizenship" value={resident.citizenship} />
                            <Field label="Civil Status" value={resident.civilStatus} />
                            <Field label="Place of Birth" value={resident.placeOfBirth} />
                            <Field label="Religion" value={resident.religion} />
                            <Field label="Height (CM)" value={resident.height ? `${resident.height} cm` : ""} />
                            <Field label="Weight (KG)" value={resident.weight ? `${resident.weight} kg` : ""} />
                            <Field label="Active RFID" value={resident.rfid} />
                            <Field label="Member Since" value={resident.createdAt ? new Date(resident.createdAt).toLocaleDateString("en-US") : ""} />
                        </Section>

                        <Section icon={Users} title="Parentage Records">
                            <Field label="Father's Full Name" value={formatParentName(resident.fatherFirstName, resident.fatherMiddleName, resident.fatherLastName)} />
                            <Field label="Mother's Maiden Name" value={formatParentName(resident.motherFirstName, resident.motherMiddleName, resident.motherLastName)} />
                        </Section>
                    </motion.div>
                )}

                {activeTab === "address" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6"
                    >
                        <Section icon={Phone} title="Contact Information">
                            <Field label="Contact Number" value={resident.contactNumber} />
                            <Field label="Email Address" value={resident.email} />
                        </Section>

                        <Section icon={MapPin} title="Residential Address">
                            <Field label="House Number" value={resident.houseNumber} />
                            <Field label="Street" value={resident.street} />
                            <Field label="Sitio" value={resident.sitio} />
                            <Field label="Purok" value={resident.purok} />
                            <Field label="Barangay" value={resident.barangay} />
                            <Field label="Municipality" value={resident.municipality} />
                            <Field label="Province" value={resident.province} />
                        </Section>
                    </motion.div>
                )}

                {activeTab === "socio" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6"
                    >
                        <Section icon={Briefcase} title="Socio-Economic Details">
                            <Field label="Occupation" value={resident.occupation} />
                            <Field label="Employer" value={resident.employer} />
                            <Field label="Employment Status" value={resident.employmentStatus} />
                            <Field label="Monthly Income" value={resident.monthlyIncome} />
                            <Field label="Educational Attainment" value={resident.educationalAttainment} />
                            <Field label="Degree Program" value={resident.degreeProgram} />
                        </Section>
                    </motion.div>
                )}

                {activeTab === "gov" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6 font-sans"
                    >
                        <Section icon={Shield} title="Government Identification">
                            <Field label="TIN" value={resident.tin} />
                            <Field label="SSS" value={resident.sss} />
                            <Field label="GSIS" value={resident.gsis} />
                            <Field label="Philhealth Number" value={resident.philhealthNumber} />
                        </Section>



                        {/* ID Document Attachments */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4 no-print">
                            <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" style={{ color: themeColor }} />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verification Attachments</h4>
                                </div>
                                {resident.idType && (
                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-350">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">ID Type:</span>
                                        <span className="uppercase text-slate-800 dark:text-slate-200">{resident.idType}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">ID Front Document</p>
                                    {resident.idFrontUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => resident.idFrontUrl && openLightbox(resident.idFrontUrl, "ID Front Document")}
                                            className="group relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 cursor-zoom-in shadow-inner"
                                        >
                                            <Image src={resident.idFrontUrl} alt="ID Front" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                        </button>
                                    ) : (
                                        <div className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center p-6 text-slate-400 shadow-inner">
                                            <XCircle className="w-7 h-7 text-slate-300 dark:text-slate-700 mb-2" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">No Document Loaded</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">ID Back Document</p>
                                    {resident.idBackUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => resident.idBackUrl && openLightbox(resident.idBackUrl, "ID Back Document")}
                                            className="group relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 cursor-zoom-in shadow-inner"
                                        >
                                            <Image src={resident.idBackUrl} alt="ID Back" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                        </button>
                                    ) : (
                                        <div className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center p-6 text-slate-400 shadow-inner">
                                            <XCircle className="w-7 h-7 text-slate-300 dark:text-slate-700 mb-2" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">No Document Loaded</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === "system" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6"
                    >
                        <Section icon={Activity} title="System Details">
                            <Field label="Registration Route" value={resident.registrationType} />
                            <Field label="Creation Date" value={resident.createdAt ? new Date(resident.createdAt).toLocaleString() : ""} />
                            <Field label="Last Updated" value={resident.updatedAt ? new Date(resident.updatedAt).toLocaleString() : ""} />
                            <Field label="Sync Status" value={resident.isSynced ? "Synced to Cloud LGU" : "Local Database Cache Only"} />
                        </Section>

                        <Section icon={Clock} title="Review Audit Details">
                            <Field label="Reviewed By" value={resident.reviewedBy} />
                            <Field label="Reviewed At" value={resident.reviewedAt ? new Date(resident.reviewedAt).toLocaleString() : ""} />
                            <Field label="Rejection Remarks" value={resident.rejectionRemarks} />
                        </Section>
                    </motion.div>
                )}
            </div>

            {/* ── print-only layout page representation ── */}
            <div className="hidden print:block print-card">
                <div style={{ borderBottom: `4px solid ${themeColor}`, paddingBottom: "15px", marginBottom: "20px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-0.05em", fontStyle: "italic", margin: 0 }}>
                        OFFICIAL RESIDENT PROFILE SHEET
                    </h1>
                    <p style={{ margin: "5px 0 0 0", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: "#666" }}>
                        MUNICIPALITY OF MAPANDAN, PANGASINAN
                    </p>
                </div>

                <div style={{ display: "flex", gap: "30px", marginBottom: "30px" }}>
                    {profileImage && (
                        <div style={{ width: "150px", height: "150px", border: "1px solid #ccc", position: "relative" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                    )}
                    <div>
                        <h2 style={{ fontSize: "22px", margin: "0 0 10px 0", textTransform: "uppercase", fontWeight: "900" }}>
                            {resident.lastName}, {resident.firstName} {resident.middleName || ""} {resident.suffix || ""}
                        </h2>
                        <p style={{ margin: "5px 0", fontSize: "12px" }}><strong>ID NUMBER:</strong> {formattedId}</p>
                        <p style={{ margin: "5px 0", fontSize: "12px" }}><strong>REGISTRATION STATUS:</strong> {resident.registrationStatus}</p>
                        <p style={{ margin: "5px 0", fontSize: "12px" }}><strong>RFID NUMBER:</strong> {resident.rfid || "N/A"}</p>
                        <p style={{ margin: "5px 0", fontSize: "12px" }}><strong>RESIDENCE:</strong> {formatFullAddress(resident)}</p>
                    </div>
                </div>

                <div className="print-section">
                    <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontSize: "14px", textTransform: "uppercase", fontWeight: "bold" }}>1. Personal & Contact Details</h3>
                    <div className="print-grid">
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>DOB:</strong> {resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>GENDER:</strong> {resident.gender}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>CIVIL STATUS:</strong> {resident.civilStatus}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>CITIZENSHIP:</strong> {resident.citizenship}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>CONTACT:</strong> {resident.contactNumber || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>EMAIL:</strong> {resident.email || "N/A"}</p>
                    </div>
                </div>

                <div className="print-section" style={{ marginTop: "20px" }}>
                    <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontSize: "14px", textTransform: "uppercase", fontWeight: "bold" }}>2. Parentage Records</h3>
                    <div className="print-grid">
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>FATHER:</strong> {formatParentName(resident.fatherFirstName, resident.fatherMiddleName, resident.fatherLastName)}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>MOTHER:</strong> {formatParentName(resident.motherFirstName, resident.motherMiddleName, resident.motherLastName)}</p>
                    </div>
                </div>

                <div className="print-section" style={{ marginTop: "20px" }}>
                    <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontSize: "14px", textTransform: "uppercase", fontWeight: "bold" }}>3. Socio-Economic Profile</h3>
                    <div className="print-grid">
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>OCCUPATION:</strong> {resident.occupation || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>EMPLOYMENT STATUS:</strong> {resident.employmentStatus || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>MONTHLY INCOME:</strong> {resident.monthlyIncome || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>EDUCATION:</strong> {resident.educationalAttainment || "N/A"}</p>
                    </div>
                </div>

                <div className="print-section" style={{ marginTop: "20px" }}>
                    <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontSize: "14px", textTransform: "uppercase", fontWeight: "bold" }}>4. Government Accounts</h3>
                    <div className="print-grid">
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>TIN:</strong> {resident.tin || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>SSS:</strong> {resident.sss || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>GSIS:</strong> {resident.gsis || "N/A"}</p>
                        <p style={{ fontSize: "11px", margin: "3px 0" }}><strong>PHILHEALTH:</strong> {resident.philhealthNumber || "N/A"}</p>
                    </div>
                </div>

                <div style={{ marginTop: "50px", borderTop: "1px solid #ccc", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "10px", color: "#666" }}>
                        Printed on {new Date().toLocaleString()} from E-Mapandan Resident Portal.
                    </div>
                    <div style={{ fontSize: "10px", textAlign: "right", color: "#666" }}>
                        Verification Hash: {resident.id}
                    </div>
                </div>
            </div>

            {/* ── Lightbox Preview Modal ── */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md"
                    >
                        <div className="absolute inset-0 cursor-zoom-out" onClick={() => setZoomedImage(null)} />

                        {/* Glassmorphic header bar */}
                        <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-black/45 border-b border-white/10 backdrop-blur-sm z-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Viewer</span>
                                <span className="text-sm font-black text-white italic uppercase tracking-tight">{zoomedImage.label}</span>
                            </div>

                            <div className="flex items-center gap-2.5 z-20">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setScale((prev) => Math.max(prev - 0.25, 1)); }}
                                    disabled={scale === 1}
                                    className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-40 transition-all shadow-md"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setScale((prev) => Math.min(prev + 0.25, 6)); }}
                                    disabled={scale === 6}
                                    className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-40 transition-all shadow-md"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setRotation((prev) => (prev + 90) % 360); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all shadow-md"
                                >
                                    <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                                    Rotate 90°
                                </button>

                                {/* Reset Button */}
                                {(rotation !== 0 || scale !== 1 || position.x !== 0 || position.y !== 0) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReset();
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all shadow-md animate-in slide-in-from-right duration-200"
                                        title="Reset Zoom & Rotation"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                        Reset
                                    </button>
                                )}

                                <button
                                    onClick={() => setZoomedImage(null)}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Image body */}
                        <div
                            className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center p-4 z-0 overflow-hidden"
                            onWheel={(e) => {
                                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                                setScale((prev) => Math.min(Math.max(prev + delta, 1), 6));
                            }}
                        >
                            <div
                                className="relative flex items-center justify-center select-none"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px)`,
                                    cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in"
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={zoomedImage.src}
                                    alt={zoomedImage.label}
                                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-none select-none"
                                    style={{
                                        transform: `rotate(${rotation}deg) scale(${scale})`,
                                        transformOrigin: "center"
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Image Crop / Reposition Modal ── */}
            <AnimatePresence>
                {cropModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <div className="absolute inset-0" onClick={() => setCropModalOpen(false)} />

                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl w-full max-w-sm relative z-10 space-y-6 flex flex-col items-center"
                        >
                            <div className="w-full text-center">
                                <h3 className="text-lg font-black uppercase tracking-tight italic text-slate-900 dark:text-white leading-none">
                                    Adjust Profile Photo
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">
                                    Drag to reposition and use slider to zoom
                                </p>
                            </div>

                            {/* Viewport container */}
                            <div 
                                ref={viewportRef}
                                className="relative w-64 h-64 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center select-none cursor-move"
                                onMouseDown={handleMouseDownCrop}
                                onMouseMove={handleMouseMoveCrop}
                                onMouseUp={handleMouseUpCrop}
                                onMouseLeave={handleMouseUpCrop}
                                onTouchStart={handleTouchStartCrop}
                                onTouchMove={handleTouchMoveCrop}
                                onTouchEnd={handleMouseUpCrop}
                            >
                                {/* The Image */}
                                {selectedImageSrc && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        ref={imageRef}
                                        src={selectedImageSrc}
                                        alt="Reposition Preview"
                                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                                        style={{
                                            transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                                            transformOrigin: "center"
                                        }}
                                    />
                                )}

                                {/* Circular Cutout Mask Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div 
                                        ref={cutoutRef}
                                        className="w-[200px] h-[200px] rounded-full border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] relative overflow-hidden" 
                                    >
                                        {/* Grid Lines inside the circle */}
                                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                                            <div className="border-r border-b border-white/40" />
                                            <div className="border-r border-b border-white/40" />
                                            <div className="border-b border-white/40" />
                                            
                                            <div className="border-r border-b border-white/40" />
                                            <div className="border-r border-b border-white/40" />
                                            <div className="border-b border-white/40" />
                                            
                                            <div className="border-r border-white/40" />
                                            <div className="border-r border-white/40" />
                                            <div className="border-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Zoom Slider Control */}
                            <div className="w-full space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Zoom</span>
                                    <span>{Math.round(cropScale * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.01"
                                    value={cropScale}
                                    onChange={(e) => setCropScale(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                />
                            </div>

                            {/* Actions Buttons */}
                            <div className="flex gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => setCropModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCropSave}
                                    className="flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                >
                                    Save & Upload
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Grid details display helper component declared outside main render
const Field = ({ label, value }: { label: string; value: any }) => {
    const displayValue = value === null || value === undefined || value === "" ? (
        <span className="text-slate-400 dark:text-slate-600 italic text-xs font-semibold">N/A</span>
    ) : typeof value === "boolean" ? (
        <span className={`text-xs font-bold ${value ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{value ? "Yes" : "No"}</span>
    ) : (
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{String(value)}</span>
    );

    return (
        <div className="flex flex-col gap-0.5 py-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
            {displayValue}
        </div>
    );
};

// Section card helper component declared outside main render
const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Icon className="w-4 h-4 text-slate-400" style={{ color: "var(--primary-theme, #2563eb)" }} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {children}
        </div>
    </div>
);
