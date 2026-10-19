'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, X, Maximize2, Minimize2,
    HelpCircle, CheckCircle, XCircle, FileText, Layout, Star, Video
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Slide, Question } from '@/types';
import { cn } from '@/lib/utils';
import { SlideRenderer } from '@/components/training/SlideRenderer';

const SLIDE_TYPE_LABEL: Record<string, string> = {
    cover: 'Capa', content: 'Conteúdo', list: 'Lista',
    question: 'Pergunta', summary: 'Resumo', image: 'Imagem', video: 'Vídeo',
};

export default function PresentationPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const { courses } = useStore();
    const course = courses.find(c => c.id === courseId);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string>>({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    const slides = course?.slides || [];
    const questions = course?.questions || [];
    const slide = slides[currentIdx];

    const goNext = useCallback(() => setCurrentIdx(i => Math.min(i + 1, slides.length - 1)), [slides.length]);
    const goPrev = useCallback(() => setCurrentIdx(i => Math.max(i - 1, 0)), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') goNext();
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev();
            if (e.key === 'Escape' && !document.fullscreenElement) window.close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goNext, goPrev]);

    const handleAnswer = (qId: string, optionId: string) =>
        setAnsweredQuestions(prev => ({ ...prev, [qId]: optionId }));

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const progress = slides.length > 0 ? ((currentIdx + 1) / slides.length) * 100 : 0;

    const bgGradientMap: Record<string, string> = {
        default: 'from-gray-900 via-gray-800 to-gray-900',
        dark: 'from-black via-gray-950 to-black',
        primary: 'from-primary via-primary/90 to-[#1a1a2e]',
        success: 'from-emerald-700 via-teal-800 to-gray-900',
        warning: 'from-amber-600 via-orange-700 to-gray-900',
        danger: 'from-red-700 via-rose-900 to-gray-900',
    };

    const typeDefaults: Record<string, string> = {
        cover: 'primary',
        summary: 'success',
        question: 'dark',
        content: 'default',
        list: 'default',
        video: 'dark',
        image: 'default',
    };

    const theme = slide?.bgTheme && slide.bgTheme !== 'default'
        ? slide.bgTheme
        : (slide ? typeDefaults[slide.type] || 'default' : 'default');

    const bg = bgGradientMap[theme] || bgGradientMap.default;

    if (!course) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
                <p className="text-xl font-medium mb-2">Curso não encontrado</p>
                <p className="text-gray-400 text-sm">O curso pode não existir ou ter sido eliminado.</p>
                <button onClick={() => window.close()} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm">Fechar</button>
            </div>
        );
    }

    return (
        <div className={cn('h-screen flex flex-col overflow-hidden bg-gradient-to-br transition-all duration-700', bg)}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-black/20 backdrop-blur-sm shrink-0">
                <span className="text-white/60 text-sm font-medium">{course.title}</span>
                <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">{currentIdx + 1} / {slides.length}</span>
                    {slide?.notes && (
                        <button onClick={() => setShowNotes(v => !v)} title="Notas do formador"
                            className={cn('p-2 rounded-lg transition-colors', showNotes ? 'bg-amber-500/30 text-amber-300' : 'text-white/50 hover:bg-white/10')}>
                            <FileText size={16} />
                        </button>
                    )}
                    <button onClick={toggleFullscreen} title="Ecrã inteiro" className="p-2 rounded-lg text-white/50 hover:bg-white/10">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={() => window.close()} title="Fechar" className="p-2 rounded-lg text-white/50 hover:bg-red-500/30 hover:text-red-300">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Slide */}
            <div className="flex-1 relative overflow-hidden">
                {slide && (
                    <SlideRenderer slide={slide} questions={questions} onAnswer={handleAnswer} answeredQuestions={answeredQuestions} />
                )}
                {showNotes && slide?.notes && (
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-950/90 backdrop-blur px-8 py-4 border-t border-amber-500/30">
                        <p className="text-xs text-amber-400 font-bold mb-1 uppercase tracking-wide">Notas do Formador</p>
                        <p className="text-amber-100 text-sm leading-relaxed">{slide.notes}</p>
                    </div>
                )}
            </div>

            {/* Bottom nav */}
            <div className="shrink-0 bg-black/30 backdrop-blur-sm">
                <div className="h-1 bg-white/10">
                    <div className="h-full bg-white/60 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between px-6 py-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest">
                        {slide ? SLIDE_TYPE_LABEL[slide.type] || slide.type : ''}
                    </span>
                    <div className="flex items-center gap-3">
                        <button onClick={goPrev} disabled={currentIdx === 0} title="Anterior"
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all">
                            <ChevronLeft size={16} /> Anterior
                        </button>
                        <button onClick={goNext} disabled={currentIdx >= slides.length - 1} title="Próximo"
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all">
                            Próximo <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {slides.map((_, i) => (
                            <button key={i} onClick={() => setCurrentIdx(i)} title={`Slide ${i + 1}`}
                                className={cn('rounded-full transition-all', i === currentIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60')} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
