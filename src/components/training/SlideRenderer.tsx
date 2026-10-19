import { HelpCircle, CheckCircle, XCircle, FileText, Layout, Star, Video } from 'lucide-react';
import type { Slide, Question } from '@/types';
import { cn } from '@/lib/utils';

interface SlideRendererProps {
    slide: Slide;
    questions?: Question[];
    onAnswer?: (qId: string, optionId: string) => void;
    answeredQuestions?: Record<string, string>;
}

export function SlideRenderer({ slide, questions = [], onAnswer, answeredQuestions = {} }: SlideRendererProps) {
    const question = slide.questionId ? questions.find((q: Question) => q.id === slide.questionId) : undefined;
    const selectedOption = question ? answeredQuestions?.[question.id] : undefined;
    const isAnswered = selectedOption !== undefined;

    switch (slide.type) {
        case 'cover':
        case 'content':
        case 'list':
        case 'image': {
            const pos = slide.imagePosition || 'center';
            const size = slide.imageSize || 'contain';
            const isBg = pos === 'background' && slide.imageUrl;
            const imgClass = cn(
                "rounded-xl",
                size === 'cover' ? "object-cover w-full h-full" : "object-contain max-w-full max-h-full"
            );

            let innerContent = null;
            if (slide.type === 'cover') {
                innerContent = (
                    <div className="flex flex-col items-center justify-center text-center w-full min-h-0 h-full">
                        {!slide.imageUrl && (
                            <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-8 shrink-0">
                                <Layout size={40} className="text-white" />
                            </div>
                        )}
                        <h1 className={cn("font-bold text-white mb-6 leading-tight shrink-0", isBg ? "text-6xl drop-shadow-md" : "text-5xl")}>{slide.title}</h1>
                        {slide.body && <p className={cn("text-xl max-w-2xl leading-relaxed shrink-0", isBg ? "drop-shadow text-white/95" : "text-white/70")}>{slide.body}</p>}
                    </div>
                );
            } else if (slide.type === 'list') {
                innerContent = (
                    <div className={cn("flex flex-col w-full", (pos === 'left' || pos === 'right') && slide.imageUrl ? "h-full justify-center" : "min-h-0 h-full")}>
                        {slide.title && !isBg && (!slide.imageUrl || pos === 'center' || pos === 'top' || pos === 'bottom') && <h2 className="text-3xl font-bold text-white mb-8 shrink-0">{slide.title}</h2>}
                        {isBg && slide.title && <h2 className="text-5xl font-bold text-white mb-10 shrink-0 drop-shadow-md text-center">{slide.title}</h2>}
                        
                        <div className={cn("flex-1 overflow-y-auto w-full", isBg && "flex items-center justify-center")}>
                            <ul className={cn("space-y-4 w-full pb-8", isBg && "max-w-4xl text-left")}>
                                {(slide.items || []).map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-4 text-xl text-white/95">
                                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</span>
                                        <span className={cn("leading-relaxed", isBg && "drop-shadow-md text-2xl font-medium")}>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            } else {
                innerContent = (
                    <div className={cn("flex flex-col w-full", (pos === 'left' || pos === 'right') && slide.imageUrl ? "h-full justify-center" : "min-h-0 h-full")}>
                        {slide.title && !isBg && (!slide.imageUrl || pos === 'center' || pos === 'top' || pos === 'bottom') && <h2 className="text-3xl font-bold text-white mb-8 shrink-0">{slide.title}</h2>}
                        {isBg && slide.title && <h2 className="text-5xl font-bold text-white mb-6 shrink-0 drop-shadow-md text-center">{slide.title}</h2>}
                        
                        {slide.body && (
                            <div className={cn("flex-1 overflow-y-auto w-full", isBg && "flex items-center justify-center text-center")}>
                                <p className={cn("text-xl text-white/85 leading-relaxed whitespace-pre-wrap", isBg && "text-2xl drop-shadow font-medium max-w-4xl")}>{slide.body}</p>
                            </div>
                        )}
                    </div>
                );
            }

            if (isBg) {
                return (
                    <div className="h-full flex flex-col px-16 py-12 relative overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            {slide.imageUrl && <img src={slide.imageUrl} alt={slide.title || ''} className={cn("w-full h-full", size === 'cover' ? 'object-cover' : 'object-contain')} />}
                            <div className="absolute inset-0 bg-black/60" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col items-center">
                            {innerContent}
                        </div>
                    </div>
                );
            }

            if (!slide.imageUrl) {
                return (
                    <div className={cn("h-full flex flex-col px-16", slide.type === 'cover' ? "py-0 justify-center" : "py-12")}>
                        {innerContent}
                    </div>
                );
            }

            const imgPanel = (
                <div className={cn("flex-1 flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden p-4 relative min-h-0", pos === 'top' || pos === 'bottom' ? 'w-full' : '')}>
                    <img src={slide.imageUrl} alt={slide.title || ''} className={imgClass} />
                </div>
            );

            return (
                <div className="h-full flex flex-col px-16 py-12">
                    {slide.title && (pos === 'left' || pos === 'right') && (
                        <h2 className="text-3xl font-bold text-white mb-6 shrink-0">{slide.title}</h2>
                    )}
                    <div className={cn(
                        "flex-1 flex min-h-0 gap-8",
                        pos === 'left' ? 'flex-row' : 
                        pos === 'right' ? 'flex-row-reverse' : 
                        pos === 'top' ? 'flex-col' : 
                        pos === 'bottom' ? 'flex-col-reverse' : 'flex-col items-center justify-center'
                    )}>
                        {imgPanel}
                        <div className={cn("flex-1 min-h-0 flex", pos === 'left' || pos === 'right' ? 'items-center' : 'w-full max-w-4xl mx-auto flex-col justify-start shrink-0')}>
                            {innerContent}
                        </div>
                    </div>
                </div>
            );
        }
        default:
            return (
                <div className="h-full flex flex-col px-16 py-12">
                    <h2 className="text-3xl font-bold text-white mb-6 shrink-0">{slide.title}</h2>
                    <div className="flex-1 min-h-0 overflow-y-auto pb-10">
                        <p className="text-white/80 text-lg whitespace-pre-wrap">{slide.body}</p>
                    </div>
                </div>
            );
    }
}
