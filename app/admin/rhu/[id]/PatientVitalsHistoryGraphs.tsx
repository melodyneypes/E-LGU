"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    Activity,
    Heart,
    Thermometer,
    Scale,
    FileText,
    Copy,
    BarChart3,
    ListFilter,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine
} from "recharts";

interface PatientVitalsHistoryGraphsProps {
    history: any[];
    currentVitals?: any;
    patientName?: string;
    loading?: boolean;
    onCopyDiagnosis?: (diagnosis: string) => void;
    onAppendOrders?: (orders: string) => void;
    onViewDetails?: (item: any) => void;
}

interface ParsedVisitPoint {
    id: string;
    index: number;
    label: string;
    date: string;
    fullDate: string;
    visitType: string;
    checkupType: string;
    doctor: string;
    systolic: number | null;
    diastolic: number | null;
    pulseRate: number | null;
    temperature: number | null;
    weight: number | null;
    bmi: number | null;
    diagnosis: string | null;
    orders: string | null;
    rawItem: any;
    isCurrent?: boolean;
}

function CustomChartTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const point: ParsedVisitPoint | undefined = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="bg-slate-900/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[180px] z-50">
            <div className="border-b border-white/10 pb-1.5 flex items-center justify-between gap-2">
                <div>
                    <p className="font-bold text-white text-xs">{point.fullDate}</p>
                    <p className="text-[10px] text-teal-400 font-semibold">{point.visitType}</p>
                </div>
                {point.isCurrent && (
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Current
                    </span>
                )}
            </div>

            <div className="space-y-1">
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                        </span>
                        <span className="font-bold font-mono text-white">
                            {entry.value} {entry.unit || ""}
                        </span>
                    </div>
                ))}
            </div>

            {point.diagnosis && (
                <div className="text-[10px] text-teal-300 border-t border-white/10 pt-1.5 line-clamp-2 max-w-[220px]">
                    <span className="text-slate-400 font-semibold">Diagnosis: </span>
                    <span className="font-mono text-white">{point.diagnosis}</span>
                </div>
            )}
            {point.doctor && (
                <div className="text-[9px] text-slate-400 border-t border-white/5 pt-1">
                    Physician: <span className="text-slate-200">{point.doctor}</span>
                </div>
            )}
        </div>
    );
}

export function PatientVitalsSkeleton() {
    return (
        <div className="space-y-5 animate-pulse">
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-teal-500/30" />
                        <div className="h-2.5 w-48 rounded bg-white/10" />
                    </div>
                    <div className="h-4 w-72 rounded bg-white/20" />
                </div>
                <div className="h-9 w-48 rounded-xl bg-white/10 shrink-0" />
            </div>

            {/* 4 Stat Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { border: "border-teal-500/20", icon: "bg-teal-500/20" },
                    { border: "border-rose-500/20", icon: "bg-rose-500/20" },
                    { border: "border-amber-500/20", icon: "bg-amber-500/20" },
                    { border: "border-purple-500/20", icon: "bg-purple-500/20" },
                ].map((item, i) => (
                    <div
                        key={i}
                        className={`p-3.5 rounded-2xl bg-white/[0.03] border ${item.border} space-y-2`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded ${item.icon}`} />
                                <div className="h-2 w-20 rounded bg-white/10" />
                            </div>
                            <div className="h-3 w-8 rounded bg-white/10" />
                        </div>
                        <div className="h-7 w-24 rounded bg-white/20 my-1" />
                        <div className="flex items-center justify-between">
                            <div className="h-2 w-16 rounded bg-white/10" />
                            <div className="h-2 w-10 rounded bg-white/10" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <div className="space-y-1">
                                    <div className="h-3 w-32 rounded bg-white/20" />
                                    <div className="h-2 w-44 rounded bg-white/10" />
                                </div>
                            </div>
                            <div className="h-4 w-20 rounded-md bg-white/10" />
                        </div>

                        {/* Chart Grid Lines & Waveform Placeholder */}
                        <div className="h-52 w-full pt-4 flex flex-col justify-between relative overflow-hidden">
                            {[1, 2, 3, 4, 5].map((g) => (
                                <div key={g} className="flex items-center gap-2 w-full">
                                    <div className="w-5 h-2 rounded bg-white/5 shrink-0" />
                                    <div className="w-full h-[1px] bg-white/5" />
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 pl-7 pr-2">
                                {[1, 2, 3, 4, 5].map((x) => (
                                    <div key={x} className="h-2 w-8 rounded bg-white/5" />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function parseSanitizedVitals(v: any) {
    if (!v) return null;
    if (typeof v === "string") {
        try { v = JSON.parse(v); } catch { return null; }
    }
    if (!v || typeof v !== "object") return null;
    let sys: number | null = null;
    let dia: number | null = null;

    if (v.systolic && !isNaN(parseFloat(v.systolic))) sys = parseFloat(v.systolic);
    if (v.diastolic && !isNaN(parseFloat(v.diastolic))) dia = parseFloat(v.diastolic);

    if ((sys === null || dia === null) && v.bloodPressure && String(v.bloodPressure).includes("/")) {
        const parts = String(v.bloodPressure).split("/");
        const p0 = parseFloat(parts[0]);
        const p1 = parseFloat(parts[1]);
        if (!isNaN(p0)) sys = p0;
        if (!isNaN(p1)) dia = p1;
    }

    // Physiological plausibility filters (filter out test typos like temp = 123°C)
    if (sys !== null && (sys < 50 || sys > 260)) sys = null;
    if (dia !== null && (dia < 30 || dia > 160)) dia = null;

    let pulse = v.pulseRate && !isNaN(parseFloat(v.pulseRate)) ? parseFloat(v.pulseRate) : null;
    if (pulse !== null && (pulse < 35 || pulse > 220)) pulse = null;

    let temp = v.temperature && !isNaN(parseFloat(v.temperature)) ? parseFloat(v.temperature) : null;
    if (temp !== null && (temp < 32 || temp > 43)) temp = null;

    let wt = v.weight && !isNaN(parseFloat(v.weight)) ? parseFloat(v.weight) : null;
    if (wt !== null && (wt < 2 || wt > 300)) wt = null;

    let ht = v.height && !isNaN(parseFloat(v.height)) ? parseFloat(v.height) : null;
    if (ht !== null && (ht < 30 || ht > 250)) ht = null;

    let bmi: number | null = null;
    if (v.bmi && !isNaN(parseFloat(v.bmi))) {
        const b = parseFloat(v.bmi);
        if (b >= 8 && b <= 70) bmi = b;
    }
    if (bmi === null && wt && ht && ht > 0) {
        bmi = parseFloat((wt / Math.pow(ht / 100, 2)).toFixed(1));
    }

    const hasAnyMetric = sys !== null || dia !== null || pulse !== null || temp !== null || wt !== null;
    if (!hasAnyMetric) return null;

    return { sys, dia, pulse, temp, wt, bmi };
}

export default function PatientVitalsHistoryGraphs({
    history,
    currentVitals,
    patientName,
    loading = false,
    onCopyDiagnosis,
    onAppendOrders,
    onViewDetails,
}: PatientVitalsHistoryGraphsProps) {

    const [viewMode, setViewMode] = useState<"graphs" | "records">("graphs");
    const [isMounted, setIsMounted] = useState(false);

    const chartScrollRef1 = useRef<HTMLDivElement | null>(null);
    const chartScrollRef2 = useRef<HTMLDivElement | null>(null);
    const chartScrollRef3 = useRef<HTMLDivElement | null>(null);
    const chartScrollRef4 = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Ensure charts display the newest consultations first by auto-scrolling to the far right
    useEffect(() => {
        if (viewMode !== "graphs") return;
        const scrollContainers = [chartScrollRef1, chartScrollRef2, chartScrollRef3, chartScrollRef4];
        const scrollToRight = () => {
            scrollContainers.forEach((ref) => {
                if (ref.current) {
                    ref.current.scrollLeft = ref.current.scrollWidth;
                }
            });
        };

        // Scroll immediately, and also after Recharts layout settles
        scrollToRight();
        const t1 = setTimeout(scrollToRight, 60);
        const t2 = setTimeout(scrollToRight, 250);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [viewMode, isMounted]);

    // Parse chronological visit points directly matching authentic consultations from history (oldest on left, newest on right)
    const chartData = useMemo(() => {
        // 1. Only include consultations that have recorded vitals
        const validConsultations = (history || []).filter((item) => {
            const parsed = parseSanitizedVitals(item.vitals);
            return parsed !== null;
        });

        // 2. Sort chronologically (oldest first, so timeline flows left-to-right with newest on the right)
        const chronoSorted = [...validConsultations].sort((a, b) => {
            const da = new Date(a.date || a.appointmentDate || a.completedAt || a.createdAt).getTime();
            const db = new Date(b.date || b.appointmentDate || b.completedAt || b.createdAt).getTime();
            const validDa = isNaN(da) ? 0 : da;
            const validDb = isNaN(db) ? 0 : db;
            return validDa - validDb;
        });

        // 3. Count dates to determine if multiple consultations share the exact same calendar day
        const dateCounts = new Map<string, number>();
        chronoSorted.forEach((item) => {
            const rawDate = item.date || item.appointmentDate || item.completedAt || item.createdAt;
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
            }
        });

        const points: ParsedVisitPoint[] = [];

        chronoSorted.forEach((item, idx) => {
            const rawDate = item.date || item.appointmentDate || item.completedAt || item.createdAt;
            const d = new Date(rawDate);
            const parsed = parseSanitizedVitals(item.vitals);
            if (!parsed || isNaN(d.getTime())) return;

            const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            const formattedDate = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
            const formattedFullDate = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

            const visitType = item.isFollowUp
                ? `Follow-Up Visit${item.followUpSequence ? ` #${item.followUpSequence}` : ""}`
                : "Initial Consultation";

            // If more than 1 consultation occurred on this date, distinguish by visit type
            const hasMultipleOnDay = (dateCounts.get(dateKey) || 0) > 1;
            const displayLabel = hasMultipleOnDay
                ? `${formattedDate} (${item.isFollowUp ? "F/U" : "Initial"})`
                : formattedDate;

            points.push({
                id: item.id || `visit_${idx}`,
                index: points.length + 1,
                label: displayLabel,
                date: displayLabel,
                fullDate: formattedFullDate,
                visitType,
                checkupType: item.checkupType || "General Consultation",
                doctor: item.doctor || item.attendingPhysician || "Attending Physician",
                systolic: parsed.sys,
                diastolic: parsed.dia,
                pulseRate: parsed.pulse,
                temperature: parsed.temp,
                weight: parsed.wt,
                bmi: parsed.bmi,
                diagnosis: item.diagnosis || null,
                orders: item.orders || null,
                rawItem: item,
                isCurrent: false,
            });
        });

        // 4. Attach current consultation's vitals (Today) if active and recorded (placed at the end so it's on the far right)
        const parsedCurrent = parseSanitizedVitals(currentVitals);
        if (parsedCurrent) {
            const today = new Date();
            const todayDateStr = today.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
            const todayFullDate = today.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

            const currentPoint: ParsedVisitPoint = {
                id: "current_visit",
                index: points.length + 1,
                label: `${todayDateStr} (Today)`,
                date: `${todayDateStr} (Today)`,
                fullDate: `${todayFullDate} (Active Visit)`,
                visitType: "Active Consultation",
                checkupType: "Current Checkup",
                doctor: "Attending Physician",
                systolic: parsedCurrent.sys,
                diastolic: parsedCurrent.dia,
                pulseRate: parsedCurrent.pulse,
                temperature: parsedCurrent.temp,
                weight: parsedCurrent.wt,
                bmi: parsedCurrent.bmi,
                diagnosis: null,
                orders: null,
                rawItem: null,
                isCurrent: true,
            };

            points.push(currentPoint);
        }

        return points;
    }, [history, currentVitals]);

    // Extract the latest available valid measurement for each metric (always latest regardless of visual sort)
    const latestMetrics = useMemo(() => {
        const currentPoint = chartData.find((p) => p.isCurrent);
        const chronological = [...chartData].sort((a, b) => {
            const da = new Date(a.rawItem?.date || a.rawItem?.appointmentDate || a.rawItem?.completedAt || a.rawItem?.createdAt || 0).getTime();
            const db = new Date(b.rawItem?.date || b.rawItem?.appointmentDate || b.rawItem?.completedAt || b.rawItem?.createdAt || 0).getTime();
            return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
        });

        const reversed = currentPoint
            ? [currentPoint, ...chronological.filter((p) => !p.isCurrent).reverse()]
            : [...chronological].reverse();

        const bpPoint = reversed.find((p) => p.systolic !== null && p.diastolic !== null);
        const pulsePoint = reversed.find((p) => p.pulseRate !== null);
        const tempPoint = reversed.find((p) => p.temperature !== null);
        const wtPoint = reversed.find((p) => p.weight !== null);

        // Previous baseline for delta calculation
        const prevBpPoint = reversed.slice(1).find((p) => p.systolic !== null && p.diastolic !== null);
        const prevPulsePoint = reversed.slice(1).find((p) => p.pulseRate !== null);
        const prevTempPoint = reversed.slice(1).find((p) => p.temperature !== null);
        const prevWtPoint = reversed.slice(1).find((p) => p.weight !== null);

        return {
            bp: bpPoint ? { sys: bpPoint.systolic, dia: bpPoint.diastolic, date: bpPoint.date, isCurrent: bpPoint.isCurrent } : null,
            bpDiff: bpPoint && prevBpPoint ? (bpPoint.systolic! - prevBpPoint.systolic!) : null,
            pulse: pulsePoint ? { val: pulsePoint.pulseRate, date: pulsePoint.date, isCurrent: pulsePoint.isCurrent } : null,
            pulseDiff: pulsePoint && prevPulsePoint ? (pulsePoint.pulseRate! - prevPulsePoint.pulseRate!) : null,
            temp: tempPoint ? { val: tempPoint.temperature, date: tempPoint.date, isCurrent: tempPoint.isCurrent } : null,
            tempDiff: tempPoint && prevTempPoint ? parseFloat((tempPoint.temperature! - prevTempPoint.temperature!).toFixed(1)) : null,
            wt: wtPoint ? { wt: wtPoint.weight, bmi: wtPoint.bmi, date: wtPoint.date, isCurrent: wtPoint.isCurrent } : null,
            wtDiff: wtPoint && prevWtPoint ? parseFloat((wtPoint.weight! - prevWtPoint.weight!).toFixed(1)) : null,
        };
    }, [chartData]);

    // Check if we have enough vitals data points to plot graphs
    const hasBPData = chartData.some((p) => p.systolic !== null && p.diastolic !== null);
    const hasPulseData = chartData.some((p) => p.pulseRate !== null);
    const hasTempData = chartData.some((p) => p.temperature !== null);
    const hasWtData = chartData.some((p) => p.weight !== null);
    const hasAnyVitals = hasBPData || hasPulseData || hasTempData || hasWtData;

    if (loading) {
        return <PatientVitalsSkeleton />;
    }

    return (
        <div className="space-y-5">
            {/* Header & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-400" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400">
                            PATIENT HEALTH TRENDS &amp; CHRONICLES
                        </p>
                    </div>
                    <p className="text-xs font-black text-white uppercase">
                        {patientName ? `${patientName} · ` : ""}Vitals Analytics Dashboard &amp; Consultation Archive
                    </p>
                </div>

                {/* Switcher Pills & Timeline Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {viewMode === "graphs" && chartData.length > 3 && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] text-slate-400 font-medium select-none">
                            <span>&larr; Scroll left for older visits</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode("graphs")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                viewMode === "graphs"
                                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Vitals Graphs
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("records")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                viewMode === "records"
                                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                            Visits Log ({history.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* GRAPHS VIEW */}
            {viewMode === "graphs" && (
                <div className="space-y-5">
                    {/* Latest Metrics Summary Cards (Inspired by Image 2 & 3) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Blood Pressure Card */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition-all space-y-1 relative overflow-hidden">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-teal-400" /> Blood Pressure
                                </span>
                                {latestMetrics.bp?.isCurrent && (
                                    <span className="text-[8px] font-black text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                        Today
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl md:text-2xl font-black font-mono text-white">
                                    {latestMetrics.bp ? `${latestMetrics.bp.sys}/${latestMetrics.bp.dia}` : "--/--"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">mmHg</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-slate-400 font-medium">
                                    {latestMetrics.bp?.date ? `Recorded ${latestMetrics.bp.date}` : "No BP on record"}
                                </span>
                                {latestMetrics.bpDiff !== null && (
                                    <span
                                        className={`font-bold flex items-center text-[9px] ${
                                            latestMetrics.bpDiff > 0
                                                ? "text-rose-400"
                                                : latestMetrics.bpDiff < 0
                                                ? "text-emerald-400"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {latestMetrics.bpDiff > 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(latestMetrics.bpDiff)} sys
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Heart Rate / Pulse Card */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-all space-y-1 relative overflow-hidden">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-rose-400" /> Heart Rate / Pulse
                                </span>
                                {latestMetrics.pulse?.isCurrent && (
                                    <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        Today
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl md:text-2xl font-black font-mono text-white">
                                    {latestMetrics.pulse ? latestMetrics.pulse.val : "--"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">bpm</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-slate-400 font-medium">
                                    {latestMetrics.pulse?.date ? `Recorded ${latestMetrics.pulse.date}` : "No HR on record"}
                                </span>
                                {latestMetrics.pulseDiff !== null && (
                                    <span
                                        className={`font-bold flex items-center text-[9px] ${
                                            latestMetrics.pulseDiff > 0
                                                ? "text-amber-400"
                                                : latestMetrics.pulseDiff < 0
                                                ? "text-teal-400"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {latestMetrics.pulseDiff > 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(latestMetrics.pulseDiff)} bpm
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Temperature Card */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all space-y-1 relative overflow-hidden">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Thermometer className="w-3 h-3 text-amber-400" /> Body Temp
                                </span>
                                {latestMetrics.temp?.isCurrent && (
                                    <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        Today
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl md:text-2xl font-black font-mono text-white">
                                    {latestMetrics.temp ? `${latestMetrics.temp.val}°C` : "--"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-slate-400 font-medium">
                                    {latestMetrics.temp?.date ? `Recorded ${latestMetrics.temp.date}` : "No Temp on record"}
                                </span>
                                {latestMetrics.tempDiff !== null && (
                                    <span
                                        className={`font-bold flex items-center text-[9px] ${
                                            latestMetrics.tempDiff > 0
                                                ? "text-rose-400"
                                                : latestMetrics.tempDiff < 0
                                                ? "text-teal-400"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {latestMetrics.tempDiff > 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(latestMetrics.tempDiff)}°C
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Weight & BMI Card */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-1 relative overflow-hidden">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Scale className="w-3 h-3 text-purple-400" /> Weight &amp; BMI
                                </span>
                                {latestMetrics.wt?.isCurrent && (
                                    <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                        Today
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl md:text-2xl font-black font-mono text-white">
                                    {latestMetrics.wt ? `${latestMetrics.wt.wt} kg` : "--"}
                                </span>
                                {latestMetrics.wt?.bmi && (
                                    <span className="text-[10px] font-bold text-purple-300">
                                        (BMI: {latestMetrics.wt.bmi})
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-slate-400 font-medium">
                                    {latestMetrics.wt?.date ? `Recorded ${latestMetrics.wt.date}` : "No Weight on record"}
                                </span>
                                {latestMetrics.wtDiff !== null && (
                                    <span
                                        className={`font-bold flex items-center text-[9px] ${
                                            latestMetrics.wtDiff > 0
                                                ? "text-amber-400"
                                                : latestMetrics.wtDiff < 0
                                                ? "text-teal-400"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {latestMetrics.wtDiff > 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(latestMetrics.wtDiff)} kg
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {!hasAnyVitals ? (
                        <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                            <Activity className="w-8 h-8 mx-auto text-slate-600" />
                            <p className="text-xs font-bold text-slate-300">No Vitals Metrics Recorded Yet</p>
                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                Previous visits were completed without numeric vitals recorded in the system. As vital signs (BP, Pulse, Temp, Weight) are taken during triage, trend graphs will populate automatically.
                            </p>
                        </div>
                    ) : (
                        /* The Visual Charts Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Chart 1: Blood Pressure Trends (Systolic & Diastolic) */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Blood Pressure Trend
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Systolic &amp; Diastolic (mmHg) across visits
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="flex items-center gap-1 text-teal-400 font-bold">
                                            <span className="w-2.5 h-0.5 bg-teal-400 rounded-full" /> Systolic
                                        </span>
                                        <span className="flex items-center gap-1 text-cyan-300 font-bold">
                                            <span className="w-2.5 h-0.5 bg-cyan-300 rounded-full" /> Diastolic
                                        </span>
                                    </div>
                                </div>

                                <div 
                                    ref={chartScrollRef1}
                                    className="w-full overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
                                >
                                    <div style={{ minWidth: `${Math.max(480, chartData.length * 85)}px`, height: "220px" }}>
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={chartData.filter((p) => p.systolic !== null && p.diastolic !== null)}
                                                    margin={{ top: 10, right: 20, left: -25, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.07)" />
                                                    <XAxis
                                                        dataKey="date"
                                                        interval={0}
                                                        stroke="#94a3b8"
                                                        fontSize={10}
                                                        fontWeight={600}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        dy={4}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={9}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        domain={[50, 180]}
                                                    />
                                                    <Tooltip content={<CustomChartTooltip />} />
                                                    <ReferenceLine y={120} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                    <ReferenceLine y={80} stroke="#06b6d4" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="systolic"
                                                        name="Systolic"
                                                        unit="mmHg"
                                                        stroke="#14b8a6"
                                                        strokeWidth={2.5}
                                                        dot={{ r: 4, fill: "#14b8a6", strokeWidth: 1, stroke: "#fff" }}
                                                        activeDot={{ r: 6, stroke: "#14b8a6", strokeWidth: 2, fill: "#fff" }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="diastolic"
                                                        name="Diastolic"
                                                        unit="mmHg"
                                                        stroke="#38bdf8"
                                                        strokeWidth={2.5}
                                                        dot={{ r: 4, fill: "#38bdf8", strokeWidth: 1, stroke: "#fff" }}
                                                        activeDot={{ r: 6, stroke: "#38bdf8", strokeWidth: 2, fill: "#fff" }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chart 2: Heart Rate / Pulse Trend */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Heart Rate / Pulse
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Resting Pulse Rate (bpm) across visits
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                        Normal: 60 - 100 bpm
                                    </span>
                                </div>

                                <div 
                                    ref={chartScrollRef2}
                                    className="w-full overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
                                >
                                    <div style={{ minWidth: `${Math.max(480, chartData.length * 85)}px`, height: "220px" }}>
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={chartData.filter((p) => p.pulseRate !== null)}
                                                    margin={{ top: 10, right: 20, left: -25, bottom: 5 }}
                                                >
                                                    <defs>
                                                        <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.07)" />
                                                    <XAxis
                                                        dataKey="date"
                                                        interval={0}
                                                        stroke="#94a3b8"
                                                        fontSize={10}
                                                        fontWeight={600}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        dy={4}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={9}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        domain={[40, 140]}
                                                    />
                                                    <Tooltip content={<CustomChartTooltip />} />
                                                    <ReferenceLine y={100} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.3} />
                                                    <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.3} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="pulseRate"
                                                        name="Heart Rate"
                                                        unit="bpm"
                                                        stroke="#f43f5e"
                                                        strokeWidth={2.5}
                                                        fill="url(#colorPulse)"
                                                        dot={{ r: 4, fill: "#f43f5e", strokeWidth: 1, stroke: "#fff" }}
                                                        activeDot={{ r: 6, stroke: "#f43f5e", strokeWidth: 2, fill: "#fff" }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chart 3: Body Temperature Trend */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Body Temperature
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Clinical temperature reading (°C)
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                        Fever threshold: 37.5°C
                                    </span>
                                </div>

                                <div 
                                    ref={chartScrollRef3}
                                    className="w-full overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
                                >
                                    <div style={{ minWidth: `${Math.max(480, chartData.length * 85)}px`, height: "220px" }}>
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={chartData.filter((p) => p.temperature !== null)}
                                                    margin={{ top: 10, right: 20, left: -25, bottom: 5 }}
                                                >
                                                    <defs>
                                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.07)" />
                                                    <XAxis
                                                        dataKey="date"
                                                        interval={0}
                                                        stroke="#94a3b8"
                                                        fontSize={10}
                                                        fontWeight={600}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        dy={4}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={9}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        domain={[35, 40]}
                                                    />
                                                    <Tooltip content={<CustomChartTooltip />} />
                                                    <ReferenceLine y={37.5} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="temperature"
                                                        name="Temperature"
                                                        unit="°C"
                                                        stroke="#f59e0b"
                                                        strokeWidth={2.5}
                                                        fill="url(#colorTemp)"
                                                        dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1, stroke: "#fff" }}
                                                        activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2, fill: "#fff" }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chart 4: Weight & BMI Trend */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Weight &amp; BMI Trend
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Weight (kg) progression over visit timeline
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="flex items-center gap-1 text-purple-400 font-bold">
                                            <span className="w-2.5 h-0.5 bg-purple-400 rounded-full" /> Weight (kg)
                                        </span>
                                    </div>
                                </div>

                                <div 
                                    ref={chartScrollRef4}
                                    className="w-full overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
                                >
                                    <div style={{ minWidth: `${Math.max(480, chartData.length * 85)}px`, height: "220px" }}>
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={chartData.filter((p) => p.weight !== null)}
                                                    margin={{ top: 10, right: 20, left: -25, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.07)" />
                                                    <XAxis
                                                        dataKey="date"
                                                        interval={0}
                                                        stroke="#94a3b8"
                                                        fontSize={10}
                                                        fontWeight={600}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        dy={4}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={9}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                                                        domain={["dataMin - 5", "dataMax + 5"]}
                                                    />
                                                    <Tooltip content={<CustomChartTooltip />} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="weight"
                                                        name="Weight"
                                                        unit="kg"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={2.5}
                                                        dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 1, stroke: "#fff" }}
                                                        activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2, fill: "#fff" }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONSULTATION RECORDS LIST VIEW (OR COMPACT SECTION BELOW) */}
            {viewMode === "records" && (
                <div className="space-y-3">
                    <p className="text-[11px] text-slate-400">
                        Review prior diagnoses and medications. You can copy past diagnosis or append past prescriptions directly into the current consultation.
                    </p>

                    {history.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] text-center space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-slate-600" />
                            <p className="text-xs font-bold text-slate-300">No Prior Consultation History Found</p>
                            <p className="text-[11px] text-slate-500">
                                This patient has no previously completed consultations or prescriptions on record.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition-all space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {item.isFollowUp ? `Follow-Up Visit #${item.followUpSequence || idx + 1}` : "Initial Consultation"}
                                            </span>
                                            <span className="text-xs font-bold text-white">
                                                {item.checkupType || "General Consultation"}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            {new Date(item.date || item.completedAt || item.createdAt).toLocaleDateString("en-PH", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </span>
                                    </div>

                                    {/* Doctor & Ref */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/5 pb-2">
                                        <div>
                                            Physician: <strong className="text-slate-200 font-bold">{item.doctor || item.attendingPhysician || "Attending Physician"}</strong>
                                        </div>
                                        {item.controlNumber && (
                                            <div className="font-mono text-[10px] text-slate-500">
                                                Ref: #{item.controlNumber}
                                            </div>
                                        )}
                                    </div>

                                    {/* Vitals Summary */}
                                    {item.vitals && (
                                        <div className="flex flex-wrap gap-2 text-[10px]">
                                            {item.vitals.bloodPressure && (
                                                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                                    BP: <strong className="text-white">{item.vitals.bloodPressure}</strong>
                                                </span>
                                            )}
                                            {item.vitals.temperature && (
                                                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                                    Temp: <strong className="text-white">{item.vitals.temperature}°C</strong>
                                                </span>
                                            )}
                                            {item.vitals.pulseRate && (
                                                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                                    HR: <strong className="text-white">{item.vitals.pulseRate} bpm</strong>
                                                </span>
                                            )}
                                            {item.vitals.weight && (
                                                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                                    Wt: <strong className="text-white">{item.vitals.weight} kg</strong>
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Diagnosis */}
                                    {item.diagnosis && (
                                        <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Diagnosis</p>
                                            <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap">{item.diagnosis}</p>
                                        </div>
                                    )}

                                    {/* Orders / Prescriptions */}
                                    {item.orders && (
                                        <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-teal-400">Prescription / Orders</p>
                                            <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap font-mono">{item.orders}</p>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-white/5">
                                        {item.diagnosis && onCopyDiagnosis && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onCopyDiagnosis(item.diagnosis)}
                                                className="h-8 px-3 rounded-lg border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                <Copy className="w-3 h-3 mr-1" />
                                                Copy Diagnosis
                                            </Button>
                                        )}
                                        {item.orders && onAppendOrders && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onAppendOrders(item.orders)}
                                                className="h-8 px-3 rounded-lg border-teal-500/30 text-teal-300 hover:bg-teal-500/10 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                Append Rx Orders
                                            </Button>
                                        )}
                                        {onViewDetails && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onViewDetails(item)}
                                                className="h-8 px-3 rounded-lg text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                View Details &rarr;
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
