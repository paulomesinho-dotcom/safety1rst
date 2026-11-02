'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WorkPlanTask, SiteLogisticsItem, SiteWorkZone } from '@/types';
import {
    Play, Pause, RotateCcw, FastForward, Calendar, Clock,
    Layers, AlertTriangle, ShieldCheck, CheckCircle2,
    Building2, Filter, Eye, EyeOff, Sliders
} from 'lucide-react';

interface Bim4dSimulationPlayerProps {
    tasks: WorkPlanTask[];
    logisticsItems: SiteLogisticsItem[];
    workZones: SiteWorkZone[];
    onDateChange: (currentSimDate: string) => void;
    currentDate: string;
    onToggleShowFuture: (show: boolean) => void;
    showFuture: boolean;
    activeTaskCount: number;
}

export default function Bim4dSimulationPlayer({
    tasks,
    logisticsItems,
    workZones,
    onDateChange,
    currentDate,
    onToggleShowFuture,
    showFuture,
    activeTaskCount
}: Bim4dSimulationPlayerProps) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x
    const [isOpen, setIsOpen] = useState<boolean>(true);

    // Compute min and max date across tasks, logistics, and work zones
    const allDates = React.useMemo(() => {
        const dates: string[] = [];
        tasks.forEach(t => {
            if (t.startDate) dates.push(t.startDate);
            if (t.endDate) dates.push(t.endDate);
        });
        logisticsItems.forEach(l => {
            if (l.startDate) dates.push(l.startDate);
            if (l.endDate) dates.push(l.endDate);
        });
        workZones.forEach(z => {
            if (z.startDate) dates.push(z.startDate);
            if (z.endDate) dates.push(z.endDate);
        });

        if (dates.length === 0) {
            const today = new Date().toISOString().slice(0, 10);
            return {
                min: today,
                max: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
                totalDays: 180
            };
        }

        dates.sort();
        const min = dates[0];
        const max = dates[dates.length - 1];
        const minMs = new Date(min).getTime();
        const maxMs = new Date(max).getTime();
        const totalDays = Math.max(1, Math.round((maxMs - minMs) / 86400000));

        return { min, max, totalDays };
    }, [tasks, logisticsItems, workZones]);

    // Current day offset from min date
    const currentDayOffset = React.useMemo(() => {
        if (!currentDate || !allDates.min) return 0;
        const cMs = new Date(currentDate).getTime();
        const minMs = new Date(allDates.min).getTime();
        return Math.max(0, Math.min(allDates.totalDays, Math.round((cMs - minMs) / 86400000)));
    }, [currentDate, allDates]);

    // Progress percentage
    const progressPercent = Math.round((currentDayOffset / allDates.totalDays) * 100);

    // Playback loop
    useEffect(() => {
        if (!isPlaying) return;

        const intervalMs = Math.max(200, Math.round(1000 / playbackSpeed));
        const timer = setInterval(() => {
            const curMs = new Date(currentDate || allDates.min).getTime();
            const nextMs = curMs + 86400000;
            const maxMs = new Date(allDates.max).getTime();

            if (nextMs >= maxMs) {
                onDateChange(allDates.max);
                setIsPlaying(false);
            } else {
                onDateChange(new Date(nextMs).toISOString().slice(0, 10));
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isPlaying, currentDate, playbackSpeed, allDates, onDateChange]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const days = Number(e.target.value);
        const minMs = new Date(allDates.min).getTime();
        const newDate = new Date(minMs + days * 86400000).toISOString().slice(0, 10);
        onDateChange(newDate);
    };

    const handleReset = () => {
        setIsPlaying(false);
        onDateChange(allDates.min);
    };

    if (!isOpen) {
        return (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="h-9 px-4 rounded-full bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700 hover:scale-105 transition-all cursor-pointer"
                >
                    <Calendar size={14} className="text-blue-400 dark:text-blue-600" />
                    <span>Abrir Simulação 4D (Cronograma & Estaleiro)</span>
                </button>
            </div>
        );
    }

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-4xl bg-white/95 dark:bg-[#1a1b1e]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 p-3 select-none transition-all">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wider font-mono">
                        4D BIM SIMULATOR
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-600" />
                        {currentDate ? new Date(currentDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data da Simulação'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        (Dia {currentDayOffset} de {allDates.totalDays})
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Active Tasks in this instant */}
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{activeTaskCount} tarefas ativas</span>
                    </div>

                    {/* Toggle Future elements transparency */}
                    <button
                        type="button"
                        onClick={() => onToggleShowFuture(!showFuture)}
                        className={`h-6 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                            showFuture
                                ? 'bg-slate-100 dark:bg-neutral-800 text-slate-700 border-slate-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                        title={showFuture ? 'Ocultar elementos futuros da simulação' : 'Mostrar elementos futuros em fantasma/transparente'}
                    >
                        {showFuture ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{showFuture ? 'Fantasma 4D' : 'Apenas Concluído'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
                        title="Minimizar barra 4D"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Slider Timeline Bar */}
            <div className="space-y-1 mb-2.5">
                <div className="relative flex items-center">
                    <input
                        type="range"
                        min={0}
                        max={allDates.totalDays}
                        value={currentDayOffset}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-slate-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{allDates.min} (Início Obra)</span>
                    <span className="font-bold text-blue-600">{progressPercent}% do Cronograma</span>
                    <span>{allDates.max} (Conclusão)</span>
                </div>
            </div>

            {/* Bottom Controls (Play / Speed / Steps) */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Reiniciar simulação desde o início"
                    >
                        <RotateCcw size={13} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                            isPlaying
                                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                        <span>{isPlaying ? 'Pausar 4D' : 'Executar Simulação 4D'}</span>
                    </button>

                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-slate-200 dark:border-neutral-700 gap-0.5 ml-1">
                        {[1, 2, 5].map(spd => (
                            <button
                                key={spd}
                                type="button"
                                onClick={() => setPlaybackSpeed(spd)}
                                className={`h-6 px-2 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                    playbackSpeed === spd
                                        ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-2xs font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {spd}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4D Color Code Legend */}
                <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Concluído</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Em Curso (Hoje)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                        <span>Futuro</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
