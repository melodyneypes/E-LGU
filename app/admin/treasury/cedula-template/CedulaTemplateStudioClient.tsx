"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    CedulaLayoutSettings,
    CedulaFieldConfig,
    DEFAULT_CEDULA_LAYOUT
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
    ArrowRight
} from "lucide-react";
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
    const [layout, setLayout] = useState<CedulaLayoutSettings>(initialLayout || DEFAULT_CEDULA_LAYOUT);
    const [selectedFieldId, setSelectedFieldId] = useState<string>("taxpayerName");
    const [showBackground, setShowBackground] = useState<boolean>(true);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isResetting, setIsResetting] = useState<boolean>(false);
    const [filterCategory, setFilterCategory] = useState<string>("ALL");

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

    // Test print
    const handleTestPrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Please allow popups to open the print preview.");
            return;
        }

        const fieldsHtml = Object.values(layout.fields)
            .filter(f => f.visible)
            .map(f => `
                <div style="
                    position: absolute;
                    left: ${f.x}%;
                    top: ${f.y}%;
                    width: ${f.width}%;
                    font-size: ${f.fontSize}pt;
                    font-weight: ${f.fontWeight === "bold" ? "700" : "400"};
                    text-align: ${f.textAlign || "left"};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-family: 'Courier New', Courier, monospace, sans-serif;
                    color: black;
                ">
                    ${f.sampleValue || ""}
                </div>
            `).join("");

        const bgStyle = layout.showBgInPrint
            ? `background-image: url('${layout.bgImageUrl || "/images/cedula-template.png"}'); background-size: 100% 100%; background-repeat: no-repeat;`
            : "background: white;";

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Cedula Print Test Preview</title>
                    <style>
                        @page {
                            size: ${layout.widthMm}mm ${layout.heightMm}mm;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background: #eee;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            font-family: Arial, sans-serif;
                        }
                        .page-container {
                            position: relative;
                            width: ${layout.widthMm}mm;
                            height: ${layout.heightMm}mm;
                            ${bgStyle}
                            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                            overflow: hidden;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @media print {
                            body {
                                background: white !important;
                                min-height: unset;
                            }
                            .page-container {
                                box-shadow: none !important;
                                margin: 0 !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        ${fieldsHtml}
                    </div>
                    <script>
                        window.onload = function() {
                            window.focus();
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                                            textAlign: field.textAlign || "left"
                                        }}
                                        className={cn(
                                            "absolute cursor-move transition-colors duration-75 px-1 py-0.5 rounded leading-tight font-mono z-10 truncate",
                                            isSelected
                                                ? "ring-2 ring-blue-600 bg-blue-500/20 text-blue-950 dark:text-blue-200 shadow-md font-bold"
                                                : "hover:ring-1 hover:ring-slate-400 bg-transparent text-slate-900 dark:text-slate-900"
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
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-4 font-bold italic">
                        <span>💡 Tip: Click any field on the canvas or right panel to inspect. Use keyboard arrow keys to nudge by 0.1% (Hold Shift for 1%).</span>
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
                                <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase">
                                    {activeField.id}
                                </Badge>
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
                                {(["ALL", "HEADER", "TAXPAYER", "TAX_ASSESSMENT"] as const).map(cat => (
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
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setSelectedFieldId(f.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold transition-all",
                                            isSelected
                                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                                : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-primary/40")} />
                                            <span className="truncate">{f.label}</span>
                                        </div>
                                        <span className={cn("text-[9px] font-mono", isSelected ? "text-white/80" : "text-slate-400")}>
                                            {f.x}%, {f.y}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
