'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import {
    ArrowLeft, Save, Wand2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
    Eye, BookOpen, CheckCircle2, AlertCircle, Loader2, Music, List, Layout,
    PlayCircle, FileText, Star, HelpCircle, Upload, Video, ExternalLink, NotebookPen, Link2, Code, Image as ImageIcon,
    Maximize2, X
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Course, Slide, Question } from '@/types';
import { cn } from '@/lib/utils';
import { SlideRenderer } from '@/components/training/SlideRenderer';
import { nanoid } from 'nanoid';

const COURSE_TYPES = [
    { value: 'onboarding', label: '⭐ Acolhimento em Obra', mandatory: true },
    { value: 'environment', label: '⭐ Ambiente em Obra', mandatory: true },
    { value: 'emergency', label: '⭐ Emergência e Evacuação', mandatory: true },
    { value: 'general_safety', label: 'Segurança Geral', mandatory: false },
    { value: 'safety_plan', label: 'Plano de Segurança Específico', mandatory: false },
    { value: 'task_based', label: 'Formação por Função/Tarefa', mandatory: false },
];

const SLIDE_TYPES = [
    { value: 'cover', label: 'Capa', icon: Layout },
    { value: 'content', label: 'Conteúdo', icon: FileText },
    { value: 'image', label: 'Imagem', icon: ImageIcon },
    { value: 'list', label: 'Lista', icon: List },
    { value: 'video', label: 'Vídeo', icon: Video },
    { value: 'question', label: 'Pergunta', icon: HelpCircle },
    { value: 'summary', label: 'Resumo', icon: Star },
];

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

    // ─── PDF Parser (client-side via pdfjs-dist) ────────────────────────────
async function parsePdf(file: File): Promise<Slide[]> {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Ensure the worker version MATCHES the API version exactly
    const VERSION = pdfjsLib.version || '5.5.207';
    
    // Set the worker source to match the exact version of the library
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Use UNPKG with the EXPLICIT version of the library to prevent mismatch
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const slides: Slide[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Use a scale of 1.25 to prevent LocalStorage QuotaExceededError while retaining legibility
        const viewport = page.getViewport({ scale: 1.25 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        // @ts-ignore - The types for pdfjs-dist are slightly mismatched but this works at runtime
        await page.render(renderContext).promise;

        // Use aggressive JPEG compression to fit in localStorage (usually 5-10MB total limit)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

        slides.push({
            id: nanoid(),
            order: i,
            type: i === 1 ? 'cover' : 'image', // Primeira página é a capa
            title: `Slide ${i}`,
            imageUrl: dataUrl,
            imagePosition: 'background',
            imageSize: 'contain',
            layout: 'default',
        });
    }

    return slides;
}

export default function CourseEditorPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const courseId = params.courseId as string;
    const isNew = courseId === 'new';

    const { courses, addCourse, updateCourse, currentUser, account } = useStore();

    const existingCourse = !isNew ? courses.find(c => c.id === courseId) : null;

    const [course, setCourse] = useState<Partial<Course>>({
        title: '',
        description: '',
        type: 'general_safety',
        language: 'pt',
        status: 'draft',
        passingScore: 70,
        isTemplate: false,
        isMandatory: false,
        isSelfLearning: false,
        sourceType: 'manual',
        slides: [],
        questions: [],
        estimatedDuration: 30,
    });

    const [mode, setMode] = useState<'ai' | 'manual' | 'import' | 'notebook'>('ai');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
    const [previewFullscreen, setPreviewFullscreen] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parsedCount, setParsedCount] = useState<number | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const [jsonImportInput, setJsonImportInput] = useState('');
    const [jsonImportError, setJsonImportError] = useState<string | null>(null);

    useEffect(() => {
        if (existingCourse) {
            setCourse(existingCourse);
        }
    }, [existingCourse]);

    const updateField = (field: keyof Course, value: any) => {
        setCourse(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    // ── AI Generation ────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setAiError(null);

        try {
            const res = await fetch('/api/training/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    type: course.type,
                    language: course.language,
                    passingScore: course.passingScore,
                }),
            });

            const data = await res.json();
            if (!data.success) {
                setAiError(data.error || 'Falha na geração pela AI. Verifica a ANTHROPIC_API_KEY no .env.local');
                return;
            }

            setCourse(prev => ({
                ...prev,
                title: data.data.title || prev.title,
                description: data.data.description || prev.description,
                estimatedDuration: data.data.estimatedDuration ?? prev.estimatedDuration,
                slides: data.data.slides || [],
                questions: data.data.questions || [],
                sourceType: 'ai_generated',
                aiPromptUsed: aiPrompt,
            }));
            setSelectedSlideId(data.data.slides?.[0]?.id || null);
            setIsDirty(true);
        } catch (err: any) {
            setAiError('Erro de rede: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── PDF Import ──────────────────────────────────────────────────────────
    const handlePdfFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setParseError('Apenas ficheiros .pdf são suportados.');
            return;
        }
        setIsParsing(true);
        setParseError(null);
        setParsedCount(null);
        try {
            const parsed = await parsePdf(file);
            if (parsed.length === 0) throw new Error('Nenhuma página encontrada no ficheiro PDF.');
            const ordered = parsed.map((s, i) => ({ ...s, order: (course.slides?.length || 0) + i + 1, id: nanoid() }));
            updateField('slides', [...(course.slides || []), ...ordered]);
            if (!course.title) updateField('title', file.name.replace('.pdf', ''));
            setParsedCount(parsed.length);
            setMode('manual');
            setSelectedSlideId(ordered[0]?.id || null);
        } catch (e: any) {
            setParseError(e.message || 'Erro ao processar o ficheiro PDF.');
        } finally {
            setIsParsing(false);
        }
    };

    // ── JSON Import ──────────────────────────────────────────────────────────
    const handleJsonImport = () => {
        setJsonImportError(null);
        if (!jsonImportInput.trim()) return;
        try {
            const data = JSON.parse(jsonImportInput);
            if (!data.slides || !Array.isArray(data.slides)) {
                throw new Error('O JSON deve conter um array obrigatório "slides".');
            }

            const newQuestions: any[] = [];
            const qIdMap = new Map();

            if (Array.isArray(data.questions)) {
                data.questions.forEach((q: any, i: number) => {
                    const newId = nanoid();
                    if (q.id) qIdMap.set(q.id, newId);
                    newQuestions.push({
                        ...q,
                        id: newId,
                        courseId,
                        order: (course.questions?.length || 0) + i + 1,
                    });
                });
            }

            const newSlides = data.slides.map((s: any, i: number) => {
                const newSlide = {
                    ...s,
                    id: nanoid(),
                    order: (course.slides?.length || 0) + i + 1,
                };

                delete newSlide.question;

                if (s.type === 'question' && s.question) {
                    const newQId = nanoid();
                    newQuestions.push({
                        ...s.question,
                        id: newQId,
                        courseId,
                        order: (course.questions?.length || 0) + newQuestions.length + 1,
                    });
                    newSlide.questionId = newQId;
                } else if (s.questionId && qIdMap.has(s.questionId)) {
                    newSlide.questionId = qIdMap.get(s.questionId);
                }

                return newSlide;
            });

            updateField('slides', [...(course.slides || []), ...newSlides]);
            if (newQuestions.length > 0) {
                updateField('questions', [...(course.questions || []), ...newQuestions]);
            }
            setParsedCount(newSlides.length);
            setMode('manual');
            setSelectedSlideId(newSlides[0]?.id || null);
            setJsonImportInput('');
        } catch (err: any) {
            setJsonImportError('Formato JSON inválido. Por favor, verifica a formatação. Detalhes: ' + err.message);
        }
    };

    // ── Slide Management ─────────────────────────────────────────────────────
    const selectedSlide = (course.slides || []).find(s => s.id === selectedSlideId);

    const addSlide = (type: Slide['type'] = 'content') => {
        const newSlide: Slide = {
            id: nanoid(),
            order: (course.slides?.length || 0) + 1,
            type,
            title: 'Novo Slide',
            body: '',
            layout: 'default',
        };
        const slides = [...(course.slides || []), newSlide];
        updateField('slides', slides);
        setSelectedSlideId(newSlide.id);
    };

    const updateSlide = (slideId: string, updates: Partial<Slide>) => {
        const slides = (course.slides || []).map(s => s.id === slideId ? { ...s, ...updates } : s);
        updateField('slides', slides);
    };

    const deleteSlide = (slideId: string) => {
        const slides = (course.slides || []).filter(s => s.id !== slideId);
        updateField('slides', slides);
        if (selectedSlideId === slideId) setSelectedSlideId(slides[0]?.id || null);
    };

    const moveSlide = (slideId: string, direction: 'up' | 'down') => {
        const slides = [...(course.slides || [])];
        const idx = slides.findIndex(s => s.id === slideId);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= slides.length) return;
        [slides[idx], slides[swapIdx]] = [slides[swapIdx], slides[idx]];
        const reordered = slides.map((s, i) => ({ ...s, order: i + 1 }));
        updateField('slides', reordered);
    };

    // ── Question Management ──────────────────────────────────────────────────
    const addQuestion = () => {
        const newQ: Question = {
            id: nanoid(),
            courseId: courseId || '',
            order: (course.questions?.length || 0) + 1,
            text: 'Nova pergunta',
            type: 'multiple_choice',
            options: [
                { id: nanoid(), text: 'Opção A', isCorrect: false },
                { id: nanoid(), text: 'Opção B', isCorrect: true },
                { id: nanoid(), text: 'Opção C', isCorrect: false },
                { id: nanoid(), text: 'Opção D', isCorrect: false },
            ],
        };
        updateField('questions', [...(course.questions || []), newQ]);
        setExpandedQuestion(newQ.id);
    };

    const updateQuestion = (qId: string, updates: Partial<Question>) => {
        const questions = (course.questions || []).map(q => q.id === qId ? { ...q, ...updates } : q);
        updateField('questions', questions);
    };

    const deleteQuestion = (qId: string) => {
        updateField('questions', (course.questions || []).filter(q => q.id !== qId));
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!course.title) return;
        setIsSaving(true);
        try {
            if (isNew) {
                const saved = addCourse({
                    ...course as any,
                    projectId,
                    accountId: account?.id || 'acc_1',
                    createdBy: currentUser?.id || 'user_1',
                });
                router.replace(`/project/${projectId}/training/courses/${saved.id}`);
            } else {
                updateCourse(courseId, course as any);
            }
            setIsDirty(false);
        } finally {
            setIsSaving(false);
        }
    };

    const slides = course.slides || [];
    const questions = course.questions || [];
    const slideTypeInfo = (type: string) => SLIDE_TYPES.find(t => t.value === type);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#131314]">
            {/* Topbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface border-b border-gray-200 dark:border-[#444746] shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        title="Voltar à página anterior"
                        onClick={() => router.back()}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2b2c] rounded-lg text-gray-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {isNew ? 'Novo Curso' : course.title || 'Editor de Curso'}
                        </h2>
                        <p className="text-xs text-gray-400">
                            {slides.length} slides · {questions.length} perguntas
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && <span className="text-xs text-amber-500">Alterações não guardadas</span>}
                    <select
                        title="Estado do curso"
                        value={course.status}
                        onChange={e => updateField('status', e.target.value)}
                        className="text-xs border border-gray-200 dark:border-[#444746] rounded-lg px-2 py-1.5 bg-white dark:bg-surface"
                    >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Arquivado</option>
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={!course.title || isSaving}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel — Config + Slides */}
                <div className="w-72 border-r border-gray-200 dark:border-[#444746] flex flex-col bg-white dark:bg-surface overflow-y-auto shrink-0">
                    {/* Course Meta */}
                    <div className="p-4 border-b border-gray-100 dark:border-[#444746] space-y-3 shrink-0">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Título</label>
                            <input
                                type="text"
                                title="Título do curso"
                                placeholder="Título do curso"
                                value={course.title || ''}
                                onChange={e => updateField('title', e.target.value)}
                                className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-500 block">Imagem de Capa</label>
                                <label className="text-[11px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                                    <Upload size={12} /> Carregar
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => updateField('coverImage', reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>
                            {course.coverImage ? (
                                <div className="relative h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-[#444746] group">
                                    <img src={course.coverImage} alt="Capa" className="w-full h-full object-cover" />
                                    <button onClick={() => updateField('coverImage', undefined)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-24 rounded-lg border-2 border-dashed border-gray-200 dark:border-[#444746] flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-[#131314]">
                                    <ImageIcon size={20} className="mb-1 opacity-40" />
                                    <span className="text-[10px]">Sem Capa</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                            <select
                                title="Tipo de curso"
                                value={course.type}
                                onChange={e => updateField('type', e.target.value)}
                                className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none"
                            >
                                {COURSE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center mt-3 mb-1">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={course.isMandatory || false}
                                        onChange={e => updateField('isMandatory', e.target.checked)}
                                    />
                                    <div className={cn("block w-10 h-6 rounded-full transition-colors", course.isMandatory ? "bg-primary" : "bg-gray-300 dark:bg-gray-600")}></div>
                                    <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", course.isMandatory ? "transform translate-x-4" : "")}></div>
                                </div>
                                <div className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Obrigatório para todos
                                </div>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Idioma</label>
                                <select
                                    title="Idioma"
                                    value={course.language}
                                    onChange={e => updateField('language', e.target.value)}
                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-1.5 bg-white dark:bg-[#131314]"
                                >
                                    <option value="pt">Português</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Aprovação (%)</label>
                                <input
                                    type="number"
                                    title="Nota mínima de aprovação"
                                    min={0}
                                    max={100}
                                    value={course.passingScore || 70}
                                    onChange={e => updateField('passingScore', Number(e.target.value))}
                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-1.5 bg-white dark:bg-[#131314]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Slides List */}
                    <div className="flex-1">
                        <div className="px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Slides ({slides.length})</span>
                            <button
                                onClick={() => addSlide('content')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a2b2c] rounded text-gray-400 hover:text-primary"
                                title="Adicionar slide"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="space-y-1 px-2">
                            {slides.map((slide, idx) => {
                                const TypeIcon = slideTypeInfo(slide.type)?.icon || FileText;
                                return (
                                    <div
                                        key={slide.id}
                                        onClick={() => setSelectedSlideId(slide.id)}
                                        className={cn(
                                            'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors',
                                            selectedSlideId === slide.id
                                                ? 'bg-primary-light text-primary'
                                                : 'hover:bg-gray-50 dark:hover:bg-[#2a2b2c] text-gray-700 dark:text-gray-300'
                                        )}
                                    >
                                        <span className="text-[10px] text-gray-400 w-4 shrink-0">{idx + 1}</span>
                                        <TypeIcon size={13} className="shrink-0" />
                                        <span className="text-xs truncate flex-1">{slide.title || 'Sem título'}</span>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                            <button
                                                onClick={e => { e.stopPropagation(); moveSlide(slide.id, 'up'); }}
                                                className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#3a3b3c] rounded"
                                                title="Mover para cima"
                                            >
                                                <ChevronUp size={11} />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); moveSlide(slide.id, 'down'); }}
                                                className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#3a3b3c] rounded"
                                                title="Mover para baixo"
                                            >
                                                <ChevronDown size={11} />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteSlide(slide.id); }}
                                                className="p-0.5 hover:bg-red-100 text-red-400 rounded"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {slides.length === 0 && (
                                <div className="text-center py-8 text-gray-400">
                                    <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-xs">Sem slides ainda</p>
                                    <button
                                        onClick={() => addSlide('cover')}
                                        className="mt-2 text-xs text-primary hover:underline"
                                    >
                                        Adicionar slide
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Add slide buttons */}
                        {slides.length > 0 && (
                            <div className="px-2 pt-2 pb-3 flex gap-1 flex-wrap">
                                {SLIDE_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => addSlide(t.value as Slide['type'])}
                                        className="text-[10px] flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-[#2a2b2c] hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded text-gray-500 border border-gray-200 dark:border-[#444746]"
                                    >
                                        <t.icon size={10} /> {t.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Mode tabs */}
                    <div className="flex border-b border-gray-200 dark:border-[#444746] shrink-0 bg-white dark:bg-surface px-4 gap-1 overflow-x-auto">
                        {([
                            { id: 'ai', label: 'Geração AI', icon: Wand2 },
                            { id: 'import', label: 'Importar', icon: Upload },
                            { id: 'manual', label: 'Editor de Slides', icon: FileText },
                            { id: 'notebook', label: 'Google Notebook', icon: NotebookPen },
                        ] as const).map(m => (
                            <button key={m.id} onClick={() => setMode(m.id)}
                                className={cn('py-2.5 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5',
                                    mode === m.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
                                <m.icon size={14} />{m.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── AI Mode ── */}
                        {mode === 'ai' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                                            <Wand2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Gerador AI de Cursos</h3>
                                            <p className="text-xs text-gray-500">Descreve o tema e a AI cria o curso completo</p>
                                        </div>
                                    </div>

                                    <textarea
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        placeholder={`Ex: "Formação de acolhimento para obra de reabilitação em Lisboa. Inclui regras de segurança, uso de EPI, procedimentos de emergência e contactos importantes."`}
                                        rows={4}
                                        title="Descreve o tema da formação"
                                        className="w-full border border-gray-200 dark:border-[#444746] rounded-lg p-3 text-sm bg-gray-50 dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light resize-none"
                                    />

                                    {aiError && (
                                        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                            <span>{aiError}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!aiPrompt.trim() || isGenerating}
                                        className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 size={16} className="animate-spin" />A gerar curso...</>
                                        ) : (
                                            <><Wand2 size={16} />Gerar Curso com AI</>
                                        )}
                                    </button>

                                    {slides.length > 0 && (
                                        <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
                                            <CheckCircle2 size={14} />
                                            <span>Curso gerado: <strong>{slides.length} slides</strong> e <strong>{questions.length} perguntas</strong>. Revê e guarda antes de publicar.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Preview of generated slides */}
                                {slides.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slides Gerados</h4>
                                        {slides.map((slide, idx) => (
                                            <div
                                                key={slide.id}
                                                onClick={() => { setSelectedSlideId(slide.id); setMode('manual'); }}
                                                className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                                                    <span className={cn(
                                                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                                        slide.type === 'cover' ? 'bg-purple-100 text-purple-700' :
                                                            slide.type === 'question' ? 'bg-orange-100 text-orange-700' :
                                                                slide.type === 'summary' ? 'bg-green-100 text-green-700' :
                                                                    slide.type === 'video' ? 'bg-red-100 text-red-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                    )}>
                                                        {slideTypeInfo(slide.type)?.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{slide.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{slide.body || slide.items?.join(', ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Import Mode ── */}
                        {mode === 'import' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                {/* PDF Import */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Importar Apresentação em PDF</h3>
                                            <p className="text-xs text-gray-500">Transforma cada página de um ficheiro PDF num slide</p>
                                        </div>
                                    </div>
                                    <input
                                        ref={pdfInputRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        title="Importar ficheiro PDF"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }}
                                    />
                                    <div
                                        className="border-2 border-dashed border-gray-300 dark:border-[#444746] rounded-xl p-8 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                                        onClick={() => pdfInputRef.current?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handlePdfFile(f); }}
                                    >
                                        {isParsing ? (
                                            <><Loader2 size={32} className="mx-auto mb-3 text-red-500 animate-spin" /><p className="text-sm text-gray-600">A processar ficheiro PDF em slides...</p></>
                                        ) : (
                                            <>
                                                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                                                <p className="font-medium text-gray-700 dark:text-gray-200">Arrasta o ficheiro .pdf aqui</p>
                                                <p className="text-sm text-gray-400 mt-1">ou clica para selecionar do computador</p>
                                                <p className="text-xs text-gray-300 mt-2">Dica: Exporta o teu PPTX para PDF e carrega-o aqui para fidelidade perfeita.</p>
                                            </>
                                        )}
                                    </div>
                                    {parseError && (
                                        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0" />{parseError}
                                        </div>
                                    )}
                                    {parsedCount !== null && (
                                        <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                                            <CheckCircle2 size={14} /><span><strong>{parsedCount} slides</strong> importados com sucesso! Podes editá-los no &ldquo;Editor de Slides&rdquo;.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Video Slide */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                                            <Video size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Adicionar Slide de Vídeo</h3>
                                            <p className="text-xs text-gray-500">YouTube, Vimeo ou URL direto de vídeo (.mp4)</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                id="video-url-input"
                                                title="URL do vídeo"
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                className="flex-1 text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-gray-50 dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const url = (e.target as HTMLInputElement).value.trim();
                                                        if (url) {
                                                            const s: Slide = { id: nanoid(), order: (course.slides?.length || 0) + 1, type: 'video', title: 'Vídeo', videoUrl: url, layout: 'default' };
                                                            updateField('slides', [...(course.slides || []), s]);
                                                            setSelectedSlideId(s.id);
                                                            setMode('manual');
                                                            (e.target as HTMLInputElement).value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                title="Adicionar slide de vídeo"
                                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-2 shrink-0"
                                                onClick={() => {
                                                    const input = document.getElementById('video-url-input') as HTMLInputElement;
                                                    const url = input?.value.trim();
                                                    if (url) {
                                                        const s: Slide = { id: nanoid(), order: (course.slides?.length || 0) + 1, type: 'video', title: 'Vídeo', videoUrl: url, layout: 'default' };
                                                        updateField('slides', [...(course.slides || []), s]);
                                                        setSelectedSlideId(s.id);
                                                        setMode('manual');
                                                        if (input) input.value = '';
                                                    }
                                                }}
                                            >
                                                <Video size={14} /> Adicionar
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400">Exemplos: YouTube, Vimeo, ou https://example.com/video.mp4</p>
                                    </div>
                                </div>

                                {/* Import JSON */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Code size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Importar JSON (NotebookLM)</h3>
                                            <p className="text-xs text-gray-500">Cola o formato estrito de slides e perguntas para integração perfeita</p>
                                        </div>
                                    </div>
                                    
                                    <textarea
                                        value={jsonImportInput}
                                        onChange={e => setJsonImportInput(e.target.value)}
                                        placeholder={`Exemplo:\n{\n  "slides": [...],\n  "questions": [...]\n}`}
                                        rows={6}
                                        title="Colar marcação JSON"
                                        className="w-full font-mono text-xs border border-gray-200 dark:border-[#444746] rounded-lg p-3 bg-gray-50 dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light resize-none mb-3"
                                    />

                                    {jsonImportError && (
                                        <div className="mb-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                            <span>{jsonImportError}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleJsonImport}
                                        disabled={!jsonImportInput.trim()}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Code size={16} /> Processar JSON
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Google Notebook Mode ── */}
                        {mode === 'notebook' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                {/* NotebookLM */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <NotebookPen size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Google NotebookLM</h3>
                                            <p className="text-xs text-gray-500">Prepara formações com IA a partir dos teus documentos</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200 space-y-2">
                                            <p className="font-semibold">Como usar o NotebookLM para preparar formações:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-xs">
                                                <li>Abre o NotebookLM e cria um novo notebook</li>
                                                <li>Carrega os teus documentos (PDF, DOCX, planos de segurança)</li>
                                                <li>Pede ao NotebookLM para gerar um resumo ou guia de formação</li>
                                                <li>Copia o conteúdo gerado e usa-o no gerador AI acima, ou cola no editor de slides</li>
                                            </ol>
                                        </div>
                                        <a
                                            href="https://notebooklm.google.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <ExternalLink size={14} /> Abrir Google NotebookLM
                                        </a>
                                    </div>
                                </div>

                                {/* Google Colab */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                            <Link2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Google Colab</h3>
                                            <p className="text-xs text-gray-500">Cria notebooks Python para processar e analisar conteúdo de formação</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                            <p className="font-semibold">Casos de uso com Colab:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>Processar PDFs e extrair conteúdo para formação com Gemini API</li>
                                                <li>Gerar apresentações automaticamente a partir de dados</li>
                                                <li>Traduzir ou adaptar conteúdo existente</li>
                                            </ul>
                                        </div>
                                        <a
                                            href="https://colab.research.google.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <ExternalLink size={14} /> Abrir Google Colab
                                        </a>
                                    </div>
                                </div>

                                {/* Gemini AI Studio */}
                                <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                            <Wand2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Google AI Studio (Gemini)</h3>
                                            <p className="text-xs text-gray-500">Gera conteúdo de formação diretamente com Gemini</p>
                                        </div>
                                    </div>
                                    <a
                                        href="https://aistudio.google.com/prompts/new_chat"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <ExternalLink size={14} /> Abrir Google AI Studio
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* ── Manual / Slide Editor Mode ── */}
                        {mode === 'manual' && (
                            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="space-y-6">
                                {selectedSlide ? (
                                    <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Editar Slide</h3>
                                            <span className={cn(
                                                'text-xs px-2 py-1 rounded-full font-medium',
                                                selectedSlide.type === 'cover' ? 'bg-purple-100 text-purple-700' :
                                                    selectedSlide.type === 'question' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                            )}>
                                                {slideTypeInfo(selectedSlide.type)?.label}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Slide</label>
                                            <select
                                                title="Tipo de slide"
                                                value={selectedSlide.type}
                                                onChange={e => updateSlide(selectedSlide.id, { type: e.target.value as any })}
                                                className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314]"
                                            >
                                                {SLIDE_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Título do Slide</label>
                                            <input
                                                type="text"
                                                title="Título do slide"
                                                value={selectedSlide.title}
                                                onChange={e => updateSlide(selectedSlide.id, { title: e.target.value })}
                                                className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light"
                                            />
                                        </div>

                                        {selectedSlide.type !== 'list' && selectedSlide.type !== 'question' && selectedSlide.type !== 'video' && (
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Conteúdo (suporta markdown)</label>
                                                <textarea
                                                    title="Conteúdo do slide"
                                                    value={selectedSlide.body || ''}
                                                    onChange={e => updateSlide(selectedSlide.id, { body: e.target.value })}
                                                    rows={6}
                                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light resize-none font-mono"
                                                />
                                            </div>
                                        )}

                                        {selectedSlide.type === 'video' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">URL do Vídeo</label>
                                                    <input
                                                        type="url"
                                                        title="URL do vídeo"
                                                        value={selectedSlide.videoUrl || ''}
                                                        onChange={e => updateSlide(selectedSlide.id, { videoUrl: e.target.value })}
                                                        placeholder="https://www.youtube.com/watch?v=... ou URL direto de vídeo"
                                                        className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">Suporta YouTube, Vimeo, e URLs diretos (.mp4, .webm)</p>
                                                </div>
                                                {selectedSlide.videoUrl && (() => {
                                                    const url = selectedSlide.videoUrl!;
                                                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
                                                    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
                                                    if (ytMatch) {
                                                        return <iframe title="Pré-visualização YouTube" className="w-full rounded-lg aspect-video" src={`https://www.youtube.com/embed/${ytMatch[1]}`} allowFullScreen />;
                                                    } else if (vmMatch) {
                                                        return <iframe title="Pré-visualização Vimeo" className="w-full rounded-lg aspect-video" src={`https://player.vimeo.com/video/${vmMatch[1]}`} allowFullScreen />;
                                                    } else {
                                                        return <video controls src={url} className="w-full rounded-lg" />;
                                                    }
                                                })()}
                                            </div>
                                        )}

                                        {selectedSlide.type === 'list' && (
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Itens da Lista</label>
                                                <div className="space-y-2">
                                                    {(selectedSlide.items || []).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <GripVertical size={14} className="text-gray-300 shrink-0" />
                                                            <input
                                                                type="text"
                                                                title={`Item ${idx + 1}`}
                                                                value={item}
                                                                onChange={e => {
                                                                    const items = [...(selectedSlide.items || [])];
                                                                    items[idx] = e.target.value;
                                                                    updateSlide(selectedSlide.id, { items });
                                                                }}
                                                                className="flex-1 text-sm border border-gray-200 dark:border-[#444746] rounded px-2 py-1.5 bg-white dark:bg-[#131314]"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const items = (selectedSlide.items || []).filter((_, i) => i !== idx);
                                                                    updateSlide(selectedSlide.id, { items });
                                                                }}
                                                                className="p-1 text-red-400 hover:bg-red-50 rounded"
                                                                title="Remover item"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => updateSlide(selectedSlide.id, { items: [...(selectedSlide.items || []), 'Novo item'] })}
                                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus size={12} /> Adicionar item
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Imagem e Personalização */}
                                        <div className="pt-4 border-t border-gray-200 dark:border-[#444746] space-y-4">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                <ImageIcon size={16} className="text-primary" /> Personalização e Imagem
                                            </h4>
                                            
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs font-medium text-gray-500 block">URL da Imagem</label>
                                                    <label className="text-[11px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                                                        <Upload size={12} /> Carregar do PC
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        updateSlide(selectedSlide.id, { imageUrl: reader.result as string });
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <input
                                                    type="text"
                                                    title="URL da imagem (ou Base64 gerado por upload)"
                                                    value={selectedSlide.imageUrl || ''}
                                                    onChange={e => updateSlide(selectedSlide.id, { imageUrl: e.target.value })}
                                                    placeholder="https://exemplo.com/imagem.png"
                                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314] focus:outline-none focus:ring-2 focus:ring-primary-light"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">Dica: podes colar um link, ou carregar uma imagem que será guardada localmente na formação.</p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Tema de Fundo</label>
                                                <select
                                                    title="Tema de fundo"
                                                    value={selectedSlide.bgTheme || 'default'}
                                                    onChange={e => updateSlide(selectedSlide.id, { bgTheme: e.target.value as any })}
                                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314]"
                                                >
                                                    <option value="default">Padrão</option>
                                                    <option value="dark">Escuro</option>
                                                    <option value="primary">Marca (Principal)</option>
                                                    <option value="success">Verde (Sucesso)</option>
                                                    <option value="warning">Amarelo (Aviso)</option>
                                                    <option value="danger">Vermelho (Perigo)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Posição da Imagem</label>
                                                <select
                                                    title="Posição da imagem"
                                                    value={selectedSlide.imagePosition || 'center'}
                                                    onChange={e => updateSlide(selectedSlide.id, { imagePosition: e.target.value as any })}
                                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314]"
                                                >
                                                    <option value="center">Centro</option>
                                                    <option value="left">Esquerda</option>
                                                    <option value="right">Direita</option>
                                                    <option value="top">Cimo</option>
                                                    <option value="bottom">Lado Inferior</option>
                                                    <option value="background">Capa / Background Total</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Escala da Imagem</label>
                                                <select
                                                    title="Tamanho da imagem"
                                                    value={selectedSlide.imageSize || 'contain'}
                                                    onChange={e => updateSlide(selectedSlide.id, { imageSize: e.target.value as any })}
                                                    className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-white dark:bg-[#131314]"
                                                >
                                                    <option value="contain">Ajustar (sem cortar)</option>
                                                    <option value="cover">Preencher (cortar excesso)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Notas do Formador (não visíveis no ecrã)</label>
                                            <textarea
                                                title="Notas do formador"
                                                value={selectedSlide.notes || ''}
                                                onChange={e => updateSlide(selectedSlide.id, { notes: e.target.value })}
                                                rows={2}
                                                placeholder="Notas internas para o formador..."
                                                className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/10 focus:outline-none resize-none text-amber-800 dark:text-amber-200 placeholder-amber-400"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-400">
                                        <Layout size={40} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-medium">Seleciona um slide para editar</p>
                                        <p className="text-sm mt-1">ou adiciona um novo slide no painel esquerdo</p>
                                    </div>
                                )}
                                </div>
                                
                                {/* Live Preview */}
                                <div className="sticky top-6">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Eye size={18} className="text-primary" />
                                        Pré-visualização
                                        {selectedSlide && (
                                            <button
                                                title="Ver em ecrã completo"
                                                onClick={() => setPreviewFullscreen(true)}
                                                className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2b2c] rounded-lg text-gray-400 hover:text-primary transition-colors"
                                            >
                                                <Maximize2 size={15} />
                                            </button>
                                        )}
                                    </h3>
                                    {selectedSlide ? (
                                        <div className={cn(
                                            "rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-[#444746] aspect-video transition-all duration-300 bg-gradient-to-br",
                                            bgGradientMap[
                                                selectedSlide.bgTheme && selectedSlide.bgTheme !== 'default' 
                                                ? selectedSlide.bgTheme 
                                                : typeDefaults[selectedSlide.type] || 'default'
                                            ] || bgGradientMap.default
                                        )}>
                                            <div className="scale-[0.5] origin-top-left w-[200%] h-[200%]">
                                                <SlideRenderer slide={selectedSlide} questions={course.questions || []} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#444746] aspect-video flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-surface/50">
                                            <Layout size={40} className="mb-4 opacity-30" />
                                            <p className="font-medium">Nenhum slide selecionado</p>
                                        </div>
                                    )}
                                </div>

                                {/* Fullscreen Preview Overlay */}
                                {previewFullscreen && selectedSlide && (
                                    <div
                                        className="fixed inset-0 z-[9999] bg-black flex flex-col"
                                        onKeyDown={e => e.key === 'Escape' && setPreviewFullscreen(false)}
                                        tabIndex={-1}
                                    >
                                        {/* Top bar */}
                                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/60 to-transparent">
                                            <span className="text-white/80 text-sm font-medium">{selectedSlide.title || 'Slide sem título'}</span>
                                            <button
                                                title="Fechar pré-visualização"
                                                onClick={() => setPreviewFullscreen(false)}
                                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        {/* Slide rendered at full size */}
                                        <div className={cn(
                                            "flex-1 bg-gradient-to-br",
                                            bgGradientMap[
                                                selectedSlide.bgTheme && selectedSlide.bgTheme !== 'default'
                                                ? selectedSlide.bgTheme
                                                : typeDefaults[selectedSlide.type] || 'default'
                                            ] || bgGradientMap.default
                                        )}>
                                            <SlideRenderer slide={selectedSlide} questions={course.questions || []} />
                                        </div>
                                        {/* Navigation hint */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/50 text-xs">
                                            <span>ESC ou clica fora para fechar</span>
                                        </div>
                                    </div>
                                )}

                                {/* Questions Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <HelpCircle size={16} /> Perguntas de Avaliação ({questions.length})
                                        </h4>
                                        <button
                                            onClick={addQuestion}
                                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <Plus size={12} /> Adicionar pergunta
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {questions.map((q, qi) => (
                                            <div key={q.id} className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl overflow-hidden">
                                                <div
                                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2b2c]"
                                                    onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-400">Q{qi + 1}</span>
                                                        <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{q.text}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Eliminar">
                                                            <Trash2 size={12} />
                                                        </button>
                                                        {expandedQuestion === q.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                </div>

                                                {expandedQuestion === q.id && (
                                                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-[#444746] pt-3">
                                                        <input
                                                            type="text"
                                                            title="Texto da pergunta"
                                                            value={q.text}
                                                            onChange={e => updateQuestion(q.id, { text: e.target.value })}
                                                            className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-gray-50 dark:bg-[#131314]"
                                                        />
                                                        <div className="space-y-2">
                                                            {q.options.map((opt, oi) => (
                                                                <div key={opt.id} className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        title="Resposta correta"
                                                                        checked={opt.isCorrect}
                                                                        onChange={e => {
                                                                            const options = q.options.map((o, i) => ({
                                                                                ...o,
                                                                                isCorrect: i === oi ? e.target.checked : (q.type === 'multiple_choice' ? o.isCorrect : false)
                                                                            }));
                                                                            updateQuestion(q.id, { options });
                                                                        }}
                                                                        className="w-4 h-4 rounded accent-primary"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        title={`Opção ${oi + 1}`}
                                                                        value={opt.text}
                                                                        onChange={e => {
                                                                            const options = q.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o);
                                                                            updateQuestion(q.id, { options });
                                                                        }}
                                                                        className={cn(
                                                                            'flex-1 text-sm border rounded px-2 py-1.5',
                                                                            opt.isCorrect ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314]'
                                                                        )}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            title="Explicação da resposta correta"
                                                            placeholder="Explicação (opcional)"
                                                            value={q.explanation || ''}
                                                            onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                                                            className="w-full text-sm border border-gray-200 dark:border-[#444746] rounded-lg px-3 py-2 bg-gray-50 dark:bg-[#131314] text-gray-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
