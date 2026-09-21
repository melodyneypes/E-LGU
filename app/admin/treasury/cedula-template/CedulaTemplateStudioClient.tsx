"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    CedulaLayoutSettings,
    CedulaFieldConfig,
    DEFAULT_CEDULA_LAYOUT,
    DEFAULT_CEDULA_FIELDS
} from "@/lib/cedula-template-config";
import { saveCedulaLayoutAction, resetCedulaLayoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Printer,
    Save,
    RotateCcw,
    Eye,
    EyeOff,
    Maximize2,
    Move,
    ZoomIn,
    ZoomOut,
    Check,
    Layers,
    Sparkles,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Trash2,
    AlertTriangle
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CedulaTemplateStudioClientProps {
    themeColor: string;
    initialLayout: CedulaLayoutSettings;
}

export default function CedulaTemplateStudioClient({
    themeColor,
    initialLayout
}: CedulaTemplateStudioClientProps) {
    const [layout, setLayout] = useState<CedulaLayoutSettings>(() => {
        const initial = initialLayout || DEFAULT_CEDULA_LAYOUT;
        const cleanedFields = { ...initial.fields };
        delete (cleanedFields as any).ctcNumber;
        delete (cleanedFields as any).taxableIncomeBasis;
        delete (cleanedFields as any).taxpayerName;

        // Make sure separate name fields exist
        if (!cleanedFields.lastName) cleanedFields.lastName = DEFAULT_CEDULA_FIELDS.lastName;
        if (!cleanedFields.firstName) cleanedFields.firstName = DEFAULT_CEDULA_FIELDS.firstName;
        if (!cleanedFields.middleName) cleanedFields.middleName = DEFAULT_CEDULA_FIELDS.middleName;

        // Make sure tin has default letterSpacing
        if (cleanedFields.tin && cleanedFields.tin.letterSpacing === undefined) {
            cleanedFields.tin.letterSpacing = DEFAULT_CEDULA_FIELDS.tin.letterSpacing;
        }

        // Make sure sexMale and sexFemale exist
        if (!cleanedFields.sexMale) cleanedFields.sexMale = DEFAULT_CEDULA_FIELDS.sexMale;
        if (!cleanedFields.sexFemale) cleanedFields.sexFemale = DEFAULT_CEDULA_FIELDS.sexFemale;
        // Make sure 4 civil status check fields exist and are positioned below FILIPINO
        if (!cleanedFields.civilStatusSingle || cleanedFields.civilStatusSingle.x > 75) {
            cleanedFields.civilStatusSingle = DEFAULT_CEDULA_FIELDS.civilStatusSingle;
        }
        if (!cleanedFields.civilStatusMarried || cleanedFields.civilStatusMarried.x > 75) {
            cleanedFields.civilStatusMarried = DEFAULT_CEDULA_FIELDS.civilStatusMarried;
        }
        if (!cleanedFields.civilStatusWidowed || cleanedFields.civilStatusWidowed.x > 75) {
            cleanedFields.civilStatusWidowed = DEFAULT_CEDULA_FIELDS.civilStatusWidowed;
        }
        if (!cleanedFields.civilStatusDivorced || cleanedFields.civilStatusDivorced.x > 75) {
            cleanedFields.civilStatusDivorced = DEFAULT_CEDULA_FIELDS.civilStatusDivorced;
        }
        return {
            ...initial,
            fields: cleanedFields
        };
    });
    const [selectedFieldId, setSelectedFieldId] = useState<string>("lastName");
    const [showBackground, setShowBackground] = useState<boolean>(true);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isResetting, setIsResetting] = useState<boolean>(false);
    const [filterCategory, setFilterCategory] = useState<string>("ALL");
    const [fieldToDelete, setFieldToDelete] = useState<CedulaFieldConfig | null>(null);

    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Drag state
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragFieldRef = useRef<string | null>(null);
    const dragOffsetRef = useRef<{ startX: number; startY: number; initialFieldX: number; initialFieldY: number }>({
        startX: 0,
        startY: 0,
        initialFieldX: 0,
        initialFieldY: 0
    });

    const activeField = layout.fields[selectedFieldId] || null;

    // Handle field deletion after confirmation
    const handleConfirmDelete = () => {
        if (!fieldToDelete) return;
        const targetId = fieldToDelete.id;

        setLayout(prev => {
            const nextFields = { ...prev.fields };
            delete nextFields[targetId];

            const nextDeleted = Array.from(new Set([...(prev.deletedFields || []), targetId]));

            return {
                ...prev,
                deletedFields: nextDeleted,
                fields: nextFields
            };
        });

        // Switch selection if current field was deleted
        if (selectedFieldId === targetId) {
            const remaining = Object.keys(layout.fields).filter(id => id !== targetId);
            setSelectedFieldId(remaining[0] || "");
        }

        toast.success(`"${fieldToDelete.label}" has been removed from template.`);
        setFieldToDelete(null);
    };

    // Save layout to server
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveCedulaLayoutAction(layout);
            if (res.success) {
                toast.success("Cedula layout configuration successfully saved!");
            } else {
                toast.error(res.error || "Failed to save layout");
            }
        } catch {
            toast.error("An unexpected error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };

    // Reset layout to defaults
    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset all field positions to their default template coordinates?")) {
            return;
        }
        setIsResetting(true);
        try {
            const res = await resetCedulaLayoutAction();
            if (res.success && res.data) {
                setLayout(res.data);
                toast.success("Layout reset to default template!");
            } else {
                toast.error(res.error || "Failed to reset");
            }
        } catch {
            toast.error("Failed to reset layout.");
        } finally {
            setIsResetting(false);
        }
    };

    // Test print: direct in-page trigger (NO about:blank or popup)
    const handleTestPrint = () => {
        window.print();
    };

    // Update specific field properties
    const updateActiveField = (updates: Partial<CedulaFieldConfig>) => {
        if (!selectedFieldId) return;
        setLayout(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [selectedFieldId]: {
                    ...prev.fields[selectedFieldId],
                    ...updates
                }
            }
        }));
    };

    // Fine-tune nudge coordinates
    const nudge = (dx: number, dy: number) => {
        if (!selectedFieldId || !activeField) return;
        const newX = Math.min(Math.max(Number((activeField.x + dx).toFixed(2)), 0), 100);
        const newY = Math.min(Math.max(Number((activeField.y + dy).toFixed(2)), 0), 100);
        updateActiveField({ x: newX, y: newY });
    };

    // Dragging handlers
    const startDrag = (fieldId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFieldId(fieldId);
        setIsDragging(true);
        dragFieldRef.current = fieldId;

        const currentField = layout.fields[fieldId];
        if (!currentField || !canvasRef.current) return;

        dragOffsetRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialFieldX: currentField.x,
            initialFieldY: currentField.y
        };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragFieldRef.current || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        if (canvasRect.width === 0 || canvasRect.height === 0) return;

        const deltaPxX = e.clientX - dragOffsetRef.current.startX;
        const deltaPxY = e.clientY - dragOffsetRef.current.startY;

        const deltaPercentX = (deltaPxX / canvasRect.width) * 100;
        const deltaPercentY = (deltaPxY / canvasRect.height) * 100;

        let newX = dragOffsetRef.current.initialFieldX + deltaPercentX;
        let newY = dragOffsetRef.current.initialFieldY + deltaPercentY;

        newX = Math.min(Math.max(Number(newX.toFixed(2)), 0), 98);
        newY = Math.min(Math.max(Number(newY.toFixed(2)), 0), 98);

        const fieldId = dragFieldRef.current;
        setLayout(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [fieldId]: {
                    ...prev.fields[fieldId],
                    x: newX,
                    y: newY
                }
            }
        }));
    }, [isDragging]);

    const onMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            dragFieldRef.current = null;
        }
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        } else {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);

    // Keyboard arrow nudging when a field is selected
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing inside input / textarea
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;

            if (!selectedFieldId) return;

            const step = e.shiftKey ? 1.0 : 0.1;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                nudge(-step, 0);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nudge(step, 0);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                nudge(0, -step);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                nudge(0, step);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const fieldEntries = Object.values(layout.fields);
    const filteredFields = fieldEntries.filter(f => {
        if (filterCategory === "ALL") return true;
        return f.category === filterCategory;
    });

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Top Hero Banner */}
            <div
                className="px-8 py-8 rounded-[2rem] border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden"
                style={{
                    backgroundColor: `${themeColor}10`,
                    borderColor: `${themeColor}25`
                }}
            >
                <div className="space-y-2 z-10">
                    <div className="flex items-center gap-2">
                        <Badge
                            style={{ backgroundColor: themeColor }}
                            className="text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md"
                        >
                            <Sparkles className="w-3 h-3 mr-1" /> Treasury Print Studio
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            CTC Form 2002 • BIR Certified Format
                        </span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                        Cedula <span style={{ color: themeColor }}>Template Studio</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-xl">
                        Visually calibrate field placements over the official Community Tax Certificate background. Drag boxes directly or fine-tune with arrow keys.
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 z-10">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={isResetting}
                        className="rounded-2xl h-12 px-5 font-black uppercase tracking-wider text-xs border-slate-200 dark:border-white/10 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    >
                        <RotateCcw className={cn("w-4 h-4 mr-2", isResetting && "animate-spin")} />
                        Reset
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestPrint}
                        className="rounded-2xl h-12 px-5 font-black uppercase tracking-wider text-xs border-slate-200 dark:border-white/10 hover:border-primary text-slate-700 dark:text-slate-200 transition-all"
                    >
                        <Printer className="w-4 h-4 mr-2 text-primary" />
                        Test Print
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ backgroundColor: themeColor }}
                        className="rounded-2xl h-12 px-7 font-black uppercase tracking-wider text-xs text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Save className={cn("w-4 h-4 mr-2", isSaving && "animate-spin")} />
                        {isSaving ? "Saving..." : "Save Layout"}
                    </Button>
                </div>
            </div>

            {/* Main Studio Workspace: 2 Columns */}
            <div className="grid grid-cols-12 gap-8">
                {/* LEFT: Interactive Visual Canvas (Cols: 8) */}
                <div className="col-span-12 xl:col-span-8 space-y-4">
                    {/* Canvas Controls Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#151b28] border border-slate-150 dark:border-white/5 shadow-sm text-xs">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Background:</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowBackground(!showBackground)}
                                    className="h-8 px-2.5 rounded-lg text-[10px] font-black uppercase"
                                >
                                    {showBackground ? <Eye className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400" />}
                                    {showBackground ? "Visible" : "Hidden"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Grid:</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={cn("h-8 px-2.5 rounded-lg text-[10px] font-black uppercase", showGrid ? "text-primary font-bold" : "text-slate-400")}
                                >
                                    <Layers className="w-3.5 h-3.5 mr-1" />
                                    {showGrid ? "On" : "Off"}
                                </Button>
                            </div>
                        </div>

                        {/* Background Opacity & Zoom */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 w-44">
                                <span className="text-[9px] font-black uppercase text-slate-400">Opacity</span>
                                <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={layout.bgOpacity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 50;
                                        setLayout(prev => ({ ...prev, bgOpacity: val }));
                                    }}
                                    className="w-24 accent-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-8">{layout.bgOpacity}%</span>
                            </div>

                            <div className="flex items-center gap-1 border-l border-slate-150 dark:border-white/10 pl-4">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="w-7 h-7 rounded-lg"
                                    onClick={() => setZoomLevel(z => Math.max(z - 10, 60))}
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </Button>
                                <span className="text-[10px] font-mono font-black text-slate-600 dark:text-slate-300 w-10 text-center">
                                    {zoomLevel}%
                                </span>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="w-7 h-7 rounded-lg"
                                    onClick={() => setZoomLevel(z => Math.min(z + 10, 150))}
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Outer Scrollable Canvas Container */}
                    <div className="bg-slate-200/70 dark:bg-slate-950/60 p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-auto flex items-center justify-center min-h-[560px] shadow-inner">
                        {/* Physical Scaled Canvas */}
                        <div
                            ref={canvasRef}
                            style={{
                                width: `${layout.widthMm * 4.4 * (zoomLevel / 100)}px`,
                                height: `${layout.heightMm * 4.4 * (zoomLevel / 100)}px`,
                                transformOrigin: "center center"
                            }}
                            className={cn(
                                "relative bg-white shadow-2xl rounded-sm transition-shadow select-none overflow-hidden",
                                showGrid && "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
                            )}
                        >
                            {/* Background Cedula Guide Image */}
                            {showBackground && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={layout.bgImageUrl || "/images/cedula-template.png"}
                                    alt="Cedula Reference Form"
                                    style={{ opacity: layout.bgOpacity / 100 }}
                                    className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                                />
                            )}

                            {/* Dynamic Draggable Overlays */}
                            {Object.values(layout.fields).map(field => {
                                if (!field.visible) return null;
                                const isSelected = field.id === selectedFieldId;

                                return (
                                    <div
                                        key={field.id}
                                        onMouseDown={(e) => startDrag(field.id, e)}
                                        style={{
                                            left: `${field.x}%`,
                                            top: `${field.y}%`,
                                            width: `${field.width}%`,
                                            fontSize: `${field.fontSize * (zoomLevel / 100)}pt`,
                                            fontWeight: field.fontWeight === "bold" ? "700" : "400",
                                            textAlign: field.textAlign || "left",
                                            letterSpacing: field.letterSpacing ? `${field.letterSpacing * (zoomLevel / 100)}px` : undefined,
                                            color: "#000000"
                                        }}
                                        className={cn(
                                            "absolute cursor-move transition-colors duration-75 px-1 py-0.5 rounded leading-tight font-mono z-10 truncate",
                                            isSelected
                                                ? "ring-2 ring-blue-500 bg-blue-500/10 text-black dark:text-black shadow-md font-bold"
                                                : "hover:ring-1 hover:ring-slate-400 bg-transparent text-black dark:text-black"
                                        )}
                                        title={`${field.label} (Click to select, drag to move)`}
                                    >
                                        {field.sampleValue || field.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Helpful tips */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 px-4 font-bold italic gap-1">
                        <span>💡 Tip: Click any field on canvas to inspect/nudge. In the Print Preview, uncheck <strong>&ldquo;Headers and footers&rdquo;</strong> under More Settings for a clean border.</span>
                        <span>Dimensions: {layout.widthMm}mm × {layout.heightMm}mm</span>
                    </div>
                </div>

                {/* RIGHT: Inspector & Field Customizer (Cols: 4) */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                    {/* Selected Field Inspector Card */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 border border-slate-150 dark:border-white/5 shadow-xl space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary italic block">
                                    Element Inspector
                                </span>
                                <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-800 dark:text-white">
                                    {activeField?.label || "Select an element"}
                                </h3>
                            </div>
                            {activeField && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateActiveField({ visible: !activeField.visible })}
                                        className={cn(
                                            "h-7 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                            activeField.visible ? "text-emerald-600 border-emerald-500/30" : "text-rose-500 border-rose-500/30"
                                        )}
                                    >
                                        {activeField.visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                        {activeField.visible ? "Visible" : "Hidden"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setFieldToDelete(activeField)}
                                        className="h-7 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider text-rose-500 border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-all"
                                        title="Delete this field from template"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete
                                    </Button>
                                    <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase">
                                        {activeField.id}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {activeField ? (
                            <div className="space-y-4 text-xs">
                                {/* Position Coordinates: X & Y */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Horizontal (X %)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={activeField.x}
                                            onChange={(e) => updateActiveField({ x: parseFloat(e.target.value) || 0 })}
                                            className="h-10 rounded-xl font-mono font-bold"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Vertical (Y %)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={activeField.y}
                                            onChange={(e) => updateActiveField({ y: parseFloat(e.target.value) || 0 })}
                                            className="h-10 rounded-xl font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Precision Nudge Buttons */}
                                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block text-center">
                                        Micro-Adjustment (Nudge)
                                    </span>
                                    <div className="flex items-center justify-center gap-2 pt-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => nudge(-0.2, 0)}
                                            className="h-8 w-9 p-0 rounded-lg"
                                            title="Move Left (0.2%)"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                        </Button>
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => nudge(0, -0.2)}
                                                className="h-7 w-9 p-0 rounded-lg"
                                                title="Move Up (0.2%)"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => nudge(0, 0.2)}
                                                className="h-7 w-9 p-0 rounded-lg"
                                                title="Move Down (0.2%)"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => nudge(0.2, 0)}
                                            className="h-8 w-9 p-0 rounded-lg"
                                            title="Move Right (0.2%)"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Width & Font Size */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Box Width (%)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            min="1"
                                            max="100"
                                            value={activeField.width}
                                            onChange={(e) => updateActiveField({ width: parseFloat(e.target.value) || 1 })}
                                            className="h-10 rounded-xl font-mono font-bold"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Font Size (pt)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            min="5"
                                            max="24"
                                            value={activeField.fontSize}
                                            onChange={(e) => updateActiveField({ fontSize: parseFloat(e.target.value) || 8 })}
                                            className="h-10 rounded-xl font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Typography: Bold & Alignment */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Weight
                                        </Label>
                                        <div className="flex rounded-xl bg-slate-100 dark:bg-white/5 p-1">
                                            <button
                                                type="button"
                                                onClick={() => updateActiveField({ fontWeight: "normal" })}
                                                className={cn(
                                                    "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                                                    activeField.fontWeight === "normal" ? "bg-white dark:bg-slate-800 text-primary shadow" : "text-slate-500"
                                                )}
                                            >
                                                Normal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateActiveField({ fontWeight: "bold" })}
                                                className={cn(
                                                    "flex-1 py-1 text-[10px] font-black rounded-lg transition-all",
                                                    activeField.fontWeight === "bold" ? "bg-white dark:bg-slate-800 text-primary shadow" : "text-slate-500"
                                                )}
                                            >
                                                Bold
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Text Align
                                        </Label>
                                        <div className="flex rounded-xl bg-slate-100 dark:bg-white/5 p-1">
                                            {(["left", "center", "right"] as const).map(align => (
                                                <button
                                                    key={align}
                                                    type="button"
                                                    onClick={() => updateActiveField({ textAlign: align })}
                                                    className={cn(
                                                        "flex-1 py-1 text-[10px] font-bold uppercase rounded-lg transition-all",
                                                        activeField.textAlign === align ? "bg-white dark:bg-slate-800 text-primary shadow" : "text-slate-500"
                                                    )}
                                                >
                                                    {align[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Letter Spacing (Tracking / Digit Box Pitch) */}
                                <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Letter Spacing / Kerning (px)
                                        </Label>
                                        <span className="text-[10px] font-mono font-bold text-primary">
                                            {activeField.letterSpacing ? `${activeField.letterSpacing}px` : "Normal (0px)"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <Input
                                            type="number"
                                            step="0.2"
                                            min="-5"
                                            max="30"
                                            value={activeField.letterSpacing ?? 0}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateActiveField({ letterSpacing: isNaN(val) ? undefined : val });
                                            }}
                                            className="h-9 rounded-xl font-mono text-xs font-bold w-24"
                                            placeholder="0"
                                        />
                                        <input
                                            type="range"
                                            min={0}
                                            max={15}
                                            step={0.2}
                                            value={activeField.letterSpacing ?? 0}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateActiveField({ letterSpacing: val > 0 ? val : undefined });
                                            }}
                                            className="flex-1 accent-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                        />
                                    </div>
                                    <span className="text-[9px] text-slate-400 block pt-0.5">
                                        Adjust pitch to line up numbers perfectly inside TIN or serial boxes.
                                    </span>
                                </div>

                                {/* Sample Test Value */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Sample Display Text
                                    </Label>
                                    <Input
                                        value={activeField.sampleValue}
                                        onChange={(e) => updateActiveField({ sampleValue: e.target.value })}
                                        className="h-10 rounded-xl font-mono text-xs font-bold"
                                        placeholder="Type test string..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400 italic">
                                Click on any field on the canvas to configure its coordinates and styles.
                            </div>
                        )}
                    </div>

                    {/* Paper & Print Settings Card */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 border border-slate-150 dark:border-white/5 shadow-xl space-y-4">
                        <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">
                                Page Dimensions & Media
                            </h4>
                            <p className="text-xs font-bold text-slate-500">
                                Physical document size in millimeters (mm)
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Width (mm)</Label>
                                <Input
                                    type="number"
                                    value={layout.widthMm}
                                    onChange={(e) => setLayout(prev => ({ ...prev, widthMm: parseInt(e.target.value) || 180 }))}
                                    className="h-10 rounded-xl font-bold font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Height (mm)</Label>
                                <Input
                                    type="number"
                                    value={layout.heightMm}
                                    onChange={(e) => setLayout(prev => ({ ...prev, heightMm: parseInt(e.target.value) || 115 }))}
                                    className="h-10 rounded-xl font-bold font-mono"
                                />
                            </div>
                        </div>

                        {/* Print Tray Offset Spacing */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                            <div className="space-y-0.5">
                                <span className="text-xs font-black uppercase tracking-wider text-primary italic block">
                                    Printer Feed Tray Spacing (Offset)
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                    Adjust Left Space (mm) so fields land dead-center on center-feed tray stubs.
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">
                                        Left Space (mm)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        value={layout.leftSpaceMm ?? 0}
                                        onChange={(e) => setLayout(prev => ({ ...prev, leftSpaceMm: parseFloat(e.target.value) || 0 }))}
                                        className="h-10 rounded-xl font-bold font-mono text-primary"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">
                                        Top Space (mm)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        value={layout.topSpaceMm ?? 0}
                                        onChange={(e) => setLayout(prev => ({ ...prev, topSpaceMm: parseFloat(e.target.value) || 0 }))}
                                        className="h-10 rounded-xl font-bold font-mono"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Print Template Background</span>
                                <span className="text-[10px] text-slate-400 block">Turn off when printing on pre-printed forms</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant={layout.showBgInPrint ? "default" : "outline"}
                                onClick={() => setLayout(prev => ({ ...prev, showBgInPrint: !prev.showBgInPrint }))}
                                className="h-8 rounded-lg text-xs font-bold"
                            >
                                {layout.showBgInPrint ? "Enabled" : "Disabled"}
                            </Button>
                        </div>
                    </div>

                    {/* All Fields Quick Directory */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 border border-slate-150 dark:border-white/5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">
                                Fields Directory ({fieldEntries.length})
                            </h4>
                            <div className="flex gap-1">
                                {(["ALL", "HEADER", "TAXPAYER", "STATUS", "TAX_ASSESSMENT"] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFilterCategory(cat)}
                                        className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider transition-all",
                                            filterCategory === cat
                                                ? "bg-primary text-white"
                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        )}
                                    >
                                        {cat === "TAX_ASSESSMENT" ? "TAX" : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {filteredFields.map(f => {
                                const isSelected = f.id === selectedFieldId;
                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => setSelectedFieldId(f.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer group",
                                            isSelected
                                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                                : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-white" : "bg-primary/40")} />
                                            <span className="truncate">{f.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={cn("text-[9px] font-mono", isSelected ? "text-white/80" : "text-slate-400")}>
                                                {f.x}%, {f.y}%
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFieldToDelete(f);
                                                }}
                                                title={`Delete ${f.label}`}
                                                className={cn(
                                                    "p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110",
                                                    isSelected
                                                        ? "text-white/80 hover:text-white hover:bg-white/20"
                                                        : "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                )}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Field Delete Confirmation Modal */}
            <Dialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
                <DialogContent className="max-w-md rounded-3xl p-6">
                    <DialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto sm:mx-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Delete Template Field?
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                Are you sure you want to remove <span className="font-bold text-slate-800 dark:text-slate-200">&ldquo;{fieldToDelete?.label}&rdquo;</span> ({fieldToDelete?.id}) from the Cedula template?
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-150 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200">What happens:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <li>This element will no longer appear on the canvas.</li>
                            <li>It will not be printed on the official Cedula document.</li>
                            <li>You can restore it anytime by clicking &ldquo;Reset&rdquo; at the top.</li>
                        </ul>
                    </div>

                    <DialogFooter className="flex items-center gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFieldToDelete(null)}
                            className="rounded-xl h-10 px-4 font-bold text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="rounded-xl h-10 px-5 font-black uppercase tracking-wider text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Yes, Delete Field
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Seamless In-Page Test Print Portal (NO popup, NO about:blank, stays on page) */}
            {mounted && createPortal(
                <>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page { 
                                size: ${Math.max((layout.widthMm || 152) + (layout.leftSpaceMm || 0), 210)}mm ${(layout.heightMm || 101) + (layout.topSpaceMm || 0)}mm; 
                                margin: 0mm !important; 
                            }
                            @page :left {
                                margin: 0mm !important;
                            }
                            @page :right {
                                margin: 0mm !important;
                            }
                            html, body { 
                                margin: 0mm !important; 
                                padding: 0mm !important; 
                                background: white !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            body > * { 
                                display: none !important; 
                            }
                            #cedula-test-print-portal {
                                display: block !important;
                                position: fixed !important;
                                left: ${layout.leftSpaceMm || 0}mm !important;
                                top: ${layout.topSpaceMm || 0}mm !important;
                                width: ${layout.widthMm}mm !important;
                                height: ${layout.heightMm}mm !important;
                                visibility: visible !important;
                                overflow: visible !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                ${layout.showBgInPrint
                                    ? `background-image: url('${layout.bgImageUrl || "/images/cedula-template.png"}'); background-size: 100% 100%; background-repeat: no-repeat;`
                                    : "background: white;"
                                }
                                z-index: 999999 !important;
                                color: black !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            #cedula-test-print-portal * {
                                visibility: visible !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                    `}} />

                    <div
                        id="cedula-test-print-portal"
                        style={{
                            position: "fixed",
                            left: "-9999px",
                            top: 0,
                            width: `${layout.widthMm}mm`,
                            height: `${layout.heightMm}mm`,
                            visibility: "hidden",
                            overflow: "visible",
                            zIndex: -1,
                            pointerEvents: "none"
                        }}
                    >
                        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "visible" }}>
                            {Object.values(layout.fields).map(field => {
                                if (!field.visible) return null;
                                const text = field.sampleValue || "";

                                return (
                                    <div
                                        key={field.id}
                                        style={{
                                            position: "absolute",
                                            left: `${field.x}%`,
                                            top: `${field.y}%`,
                                            width: `${field.width}%`,
                                            fontSize: `${field.fontSize}pt`,
                                            fontWeight: field.fontWeight === "bold" ? "700" : "400",
                                            textAlign: field.textAlign || "left",
                                            letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                                            fontFamily: "'Courier New', Courier, monospace, sans-serif",
                                            lineHeight: 1.1,
                                            whiteSpace: "nowrap",
                                            overflow: "visible",
                                            color: "black"
                                        }}
                                    >
                                        {text}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
