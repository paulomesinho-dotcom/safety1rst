'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, X, Maximize2, Minimize2,
    HelpCircle, CheckCircle, XCircle, List, FileText, Layout, Star, Video
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Slide, Question, Course } from '@/types';
import { cn } from '@/lib/utils';

const SLIDE_TYPE_LABEL: Record<string, string> = {
    cover: 'Capa',
    content: 'Conteúdo',
    list: 'Lista',
    question: 'Pergunta',
    summary: 'Resumo',
    image: 'Imagem',
    video: 'Vídeo',
};

function SlideRenderer({ slide, questions, onAnswer, answeredQuestions }:
    {
        slide: Slide;
        questions: Question[];
        onAnswer?: (qId: string, optionId: string) => void;
        answeredQuestions?: Record<string, string>;
    }) {

    const question = slide.questionId
        ? questions.find(q => q.id === slide.questionId)
        : questions.find(q => q.id === slide.questionId);

    const selectedOption = question ? answeredQuestions?.[question.id] : undefined;
    const isAnswered = selectedOption !== undefined;
    const correctOption = question?.options.find(o => o.isCorrect);

    switch (slide.type) {
        case 'cover':
            return (
                <div className="h-full flex flex-col items-center justify-center text-center px-16">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-8">
                        <Layout size={40} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6 leading-tight">{slide.title}</h1>
                    {slide.body && (
                        <p className="text-xl text-white/70 max-w-2xl leading-relaxed">{slide.body}</p>
                    )}
                </div>
            );

        case 'content':
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <h2 className="text-3xl font-bold text-white mb-8">{slide.title}</h2>
                    <div className="flex-1 flex items-center">
                        <div className="prose prose-invert prose-lg max-w-none text-white/85 leading-relaxed whitespace-pre-wrap">
                            {slide.body}
                        </div>
                    </div>
                </div>
            );

        case 'list':
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <h2 className="text-3xl font-bold text-white mb-8">{slide.title}</h2>
                    <div className="flex-1 flex items-center">
                        <ul className="space-y-4 w-full">
                            {(slide.items || []).map((item, i) => (
                                <li key={i} className="flex items-start gap-4 text-xl text-white/85">
                                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</span>
                                    <span className="leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            );

        case 'question':
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <div className="flex items-center gap-3 mb-8">
                        <HelpCircle size={24} className="text-amber-400" />
                        <span className="text-amber-400 font-semibold text-lg">Pergunta de Avaliação</span>
                    </div>
                    {question ? (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-8 leading-snug">{question.text}</h2>
                            <div className="space-y-3">
                                {question.options.map(opt => {
                                    let optClass = 'bg-white/10 border border-white/20 hover:bg-white/20';
                                    if (isAnswered) {
                                        if (opt.isCorrect) optClass = 'bg-green-500/30 border border-green-400 text-green-100';
                                        else if (selectedOption === opt.id) optClass = 'bg-red-500/30 border border-red-400 text-red-100';
                                        else optClass = 'bg-white/5 border border-white/10 opacity-50';
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => !isAnswered && onAnswer?.(question.id, opt.id)}
                                            disabled={isAnswered}
                                            className={cn('w-full text-left px-5 py-4 rounded-xl text-white text-lg transition-all cursor-pointer flex items-center gap-3', optClass)}
                                        >
                                            {isAnswered && opt.isCorrect && <CheckCircle size={20} className="text-green-400 shrink-0" />}
                                            {isAnswered && selectedOption === opt.id && !opt.isCorrect && <XCircle size={20} className="text-red-400 shrink-0" />}
                                            {opt.text}
                                        </button>
                                    );
                                })}
                            </div>
                            {isAnswered && question.explanation && (
                                <div className="mt-4 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-200 text-sm">
                                    💡 {question.explanation}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-white/50 text-lg">Pergunta não encontrada para este slide.</p>
                    )}
                </div>
            );

        case 'summary':
            return (
                <div className="h-full flex flex-col items-center justify-center text-center px-16">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-8">
                        <Star size={40} className="text-amber-400" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6">{slide.title}</h2>
                    {slide.body && (
                        <p className="text-xl text-white/75 max-w-2xl leading-relaxed whitespace-pre-wrap">{slide.body}</p>
                    )}
                </div>
            );

        case 'video':
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <h2 className="text-3xl font-bold text-white mb-8">{slide.title}</h2>
                    <div className="flex-1 flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden p-4">
                        {slide.videoUrl ? (() => {
                            const url = slide.videoUrl!;
                            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
                            const vmMatch = url.match(/vimeo\.com\/(\d+)/);
                            if (ytMatch) {
                                return <iframe title="Apresentação YouTube" className="w-full h-full rounded-xl" src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`} allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />;
                            } else if (vmMatch) {
                                return <iframe title="Apresentação Vimeo" className="w-full h-full rounded-xl" src={`https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1`} allowFullScreen allow="autoplay; fullscreen; picture-in-picture" />;
                            } else {
                                return <video controls autoPlay src={url} className="w-full h-full object-contain rounded-xl" />;
                            }
                        })() : (
                            <div className="flex flex-col items-center text-white/50">
                                <Video size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">Nenhum vídeo configurado.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        default:
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <h2 className="text-3xl font-bold text-white mb-6">{slide.title}</h2>
                    <p className="text-white/80 text-lg whitespace-pre-wrap">{slide.body}</p>
                </div>
            );
    }
}

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

    const goNext = useCallback(() => {
        setCurrentIdx(i => Math.min(i + 1, slides.length - 1));
    }, [slides.length]);

    const goPrev = useCallback(() => {
        setCurrentIdx(i => Math.max(i - 1, 0));
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'PageDown') goNext();
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev();
            if (e.key === 'Escape') window.close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goNext, goPrev]);

    const handleAnswer = (qId: string, optionId: string) => {
        setAnsweredQuestions(prev => ({ ...prev, [qId]: optionId }));
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Progress
    const progress = slides.length > 0 ? ((currentIdx + 1) / slides.length) * 100 : 0;

    // Background gradients by slide type
    const bgGradient: Record<string, string> = {
        cover: 'from-primary via-primary/90 to-[#1a1a2e]',
        summary: 'from-emerald-700 via-teal-800 to-gray-900',
        question: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
        content: 'from-gray-900 via-gray-800 to-gray-900',
        list: 'from-gray-900 via-gray-800 to-gray-900',
        video: 'from-gray-950 via-black to-gray-950',
    };

    const bg = slide ? (bgGradient[slide.type] || 'from-gray-900 via-gray-800 to-gray-900') : 'from-gray-900 to-gray-900';

    if (!course) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
                <p className="text-xl font-medium mb-2">Curso não encontrado</p>
                <p className="text-gray-400 text-sm">O curso pode não ter sido publicado ou o ID está incorrecto.</p>
                <button onClick={() => window.close()} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm">Fechar</button>
            </div>
        );
    }

    return (
        <div className={cn('h-screen flex flex-col overflow-hidden bg-gradient-to-br', bg, 'transition-all duration-700')}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-black/20 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-white/60 text-sm">{course.title}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">{currentIdx + 1} / {slides.length}</span>
                    {slide?.notes && (
                        <button
                            onClick={() => setShowNotes(v => !v)}
                            title="Ver notas"
                            className={cn('p-2 rounded-lg text-sm transition-colors',
                                showNotes ? 'bg-amber-500/30 text-amber-300' : 'text-white/50 hover:bg-white/10')}
                        >
                            <FileText size={16} />
                        </button>
                    )}
                    <button onClick={toggleFullscreen} className="p-2 rounded-lg text-white/50 hover:bg-white/10" title="Ecrã inteiro">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={() => window.close()} className="p-2 rounded-lg text-white/50 hover:bg-red-500/30 hover:text-red-300" title="Fechar apresentação">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Slide content */}
            <div className="flex-1 relative overflow-hidden">
                {slide && (
                    <SlideRenderer
                        slide={slide}
                        questions={questions}
                        onAnswer={handleAnswer}
                        answeredQuestions={answeredQuestions}
                    />
                )}

                {/* Notes panel */}
                {showNotes && slide?.notes && (
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-950/90 backdrop-blur px-8 py-4 border-t border-amber-500/30">
                        <p className="text-xs text-amber-400 font-bold mb-1 uppercase tracking-wide">Notas do Formador</p>
                        <p className="text-amber-100 text-sm leading-relaxed">{slide.notes}</p>
                    </div>
                )}
            </div>

            {/* Progress + Navigation */}
            <div className="shrink-0 bg-black/30 backdrop-blur-sm">
                {/* Progress bar */}
                <div className="h-1 bg-white/10">
                    <div
                        className="h-full bg-white/60 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center justify-between px-6 py-3">
                    {/* Slide type badge */}
                    <span className="text-xs text-white/40 uppercase tracking-widest">
                        {slide ? SLIDE_TYPE_LABEL[slide.type] || slide.type : ''}
                    </span>

                    {/* Navigation */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goPrev}
                            disabled={currentIdx === 0}
                            title="Slide anterior"
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all"
                        >
                            <ChevronLeft size={16} /> Anterior
                        </button>
                        <button
                            onClick={goNext}
                            disabled={currentIdx >= slides.length - 1}
                            title="Próximo slide"
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all"
                        >
                            Próximo <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Slide thumbnails (dots) */}
                    <div className="flex items-center gap-1.5">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIdx(i)}
                                title={`Slide ${i + 1}`}
                                className={cn(
                                    'rounded-full transition-all',
                                    i === currentIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
