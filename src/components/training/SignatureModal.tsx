'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, RotateCcw, CheckCircle2, PenLine, UserCheck } from 'lucide-react';
import type { TrainingSession, Worker, Course } from '@/types';
import { cn } from '@/lib/utils';

interface SignatureEntry {
    workerId: string;
    signatureDataUrl: string;
    signedAt: string;
}

interface Props {
    session: TrainingSession;
    course: Course | undefined;
    workers: Worker[];
    onComplete: (signatures: SignatureEntry[]) => void;
    onClose: () => void;
}

export function SignatureModal({ session, course, workers, onComplete, onClose }: Props) {
    const enrolledWorkers = workers.filter(w => session.enrolledWorkers.includes(w.id));
    const [phase, setPhase] = useState<'list' | 'sign' | 'done'>('list');
    const [currentWorkerIdx, setCurrentWorkerIdx] = useState(0);
    const [signatures, setSignatures] = useState<SignatureEntry[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasStrokes, setHasStrokes] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const currentWorker = enrolledWorkers[currentWorkerIdx];

    // Canvas setup
    useEffect(() => {
        if (phase !== 'sign') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasStrokes(false);
    }, [phase, currentWorkerIdx]);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0];
            return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        e.preventDefault();
        setIsDrawing(true);
        lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current; if (!canvas) return;
        e.preventDefault();
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const pos = getPos(e, canvas);
        if (lastPos.current) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            setHasStrokes(true);
        }
        lastPos.current = pos;
    };

    const endDraw = () => { setIsDrawing(false); lastPos.current = null; };

    const clearCanvas = () => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasStrokes(false);
    };

    const confirmSignature = () => {
        const canvas = canvasRef.current; if (!canvas || !currentWorker) return;
        const dataUrl = canvas.toDataURL('image/png');
        const entry: SignatureEntry = { workerId: currentWorker.id, signatureDataUrl: dataUrl, signedAt: new Date().toISOString() };
        const updated = [...signatures, entry];
        setSignatures(updated);

        if (currentWorkerIdx + 1 < enrolledWorkers.length) {
            setCurrentWorkerIdx(i => i + 1);
        } else {
            setPhase('done');
            onComplete(updated);
        }
    };

    const skipWorker = () => {
        if (currentWorkerIdx + 1 < enrolledWorkers.length) {
            setCurrentWorkerIdx(i => i + 1);
        } else {
            setPhase('done');
            onComplete(signatures);
        }
    };

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#444746] bg-indigo-50 dark:bg-indigo-900/20">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Registar Presenças</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{course?.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg text-gray-400"><X size={18} /></button>
                </div>

                {/* Worker list phase */}
                {phase === 'list' && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <p className="px-6 pt-4 pb-2 text-sm text-gray-500">Seleciona o primeiro trabalhador para assinar:</p>
                        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2 max-h-80">
                            {enrolledWorkers.map((w, i) => (
                                <button key={w.id} onClick={() => { setCurrentWorkerIdx(i); setPhase('sign'); }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-[#444746] hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                                        {w.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{w.name}</p>
                                        <p className="text-xs text-gray-400">{w.role || 'Operário'}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                                </button>
                            ))}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#444746] flex justify-between items-center">
                            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                            <button onClick={() => { setCurrentWorkerIdx(0); setPhase('sign'); }}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
                                <PenLine size={15} /> Iniciar por Ordem
                            </button>
                        </div>
                    </div>
                )}

                {/* Signature phase */}
                {phase === 'sign' && currentWorker && (
                    <div className="flex flex-col p-6 gap-4">
                        {/* Progress dots */}
                        <div className="flex items-center gap-1.5 justify-center">
                            {enrolledWorkers.map((_, i) => {
                                const signed = signatures.some(s => s.workerId === enrolledWorkers[i].id);
                                return (
                                    <div key={i} className={cn('rounded-full transition-all', 
                                        signed ? 'w-2 h-2 bg-green-500' :
                                        i === currentWorkerIdx ? 'w-5 h-2 bg-indigo-600' :
                                        'w-2 h-2 bg-gray-200')} />
                                );
                            })}
                        </div>

                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 flex items-center justify-center font-bold text-lg mx-auto mb-2">
                                {currentWorker.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white">{currentWorker.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{currentWorkerIdx + 1} de {enrolledWorkers.length} · {course?.title}</p>
                        </div>

                        <div className="relative">
                            <p className="text-xs text-gray-400 mb-2 text-center">Assine no espaço abaixo:</p>
                            <canvas
                                ref={canvasRef} width={480} height={180}
                                className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl bg-white touch-none cursor-crosshair"
                                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                            {!hasStrokes && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                    <PenLine size={32} className="text-indigo-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={clearCanvas} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-[#444746] rounded-xl text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-[#131314]">
                                <RotateCcw size={14} /> Limpar
                            </button>
                            <button onClick={skipWorker} className="flex-1 py-2 border border-gray-200 dark:border-[#444746] rounded-xl text-sm text-gray-400 hover:bg-gray-50">
                                Ignorar (Ausente)
                            </button>
                            <button onClick={confirmSignature} disabled={!hasStrokes}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
                                <CheckCircle2 size={15} /> Confirmar
                            </button>
                        </div>
                    </div>
                )}

                {/* Done phase */}
                {phase === 'done' && (
                    <div className="p-8 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <UserCheck size={32} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">Presenças Registadas!</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {signatures.length} de {enrolledWorkers.length} trabalhadores assinaram.
                            </p>
                        </div>
                        <button onClick={onClose} className="mt-2 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
