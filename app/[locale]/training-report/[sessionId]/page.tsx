'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function TrainingReportPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { trainingSessions, courses, workers, projects } = useStore();

    const session = trainingSessions.find(s => s.id === sessionId);
    const course = courses.find(c => c.id === session?.courseId);
    const project = projects.find(p => p.id === session?.projectId);
    const presenter = workers.find(w => w.id === session?.trainerId);

    useEffect(() => {
        if (session) {
            document.title = `Registo de Formação – ${course?.title || session.courseId}`;
        }
    }, [session, course]);

    if (!session || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 text-lg">Sessão não encontrada.</p>
            </div>
        );
    }

    const attendees = session.attendees.filter(a => a.present);
    const absentees = session.enrolledWorkers.filter(wId => !session.attendees.find(a => a.workerId === wId && a.present));
    const getWorker = (id: string) => workers.find(w => w.id === id);
    const sessionDate = new Date(session.scheduledDate).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const printDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const completedDate = session.completedAt ? new Date(session.completedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; }
                    @page { margin: 1.5cm; size: A4; }
                }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
            `}</style>

            {/* Print Button Bar */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
                <p className="text-sm font-medium">Registo de Formação — Pré-visualização</p>
                <div className="flex gap-3">
                    <button onClick={() => window.close()} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Fechar</button>
                    <button onClick={() => window.print()} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold">
                        🖨 Imprimir / Guardar PDF
                    </button>
                </div>
            </div>

            {/* Report Document */}
            <div className="max-w-[210mm] mx-auto bg-white pt-16 pb-8 px-12 no-print:mt-14">

                {/* ── Header ── */}
                <div className="border-b-2 border-indigo-700 pb-6 mb-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-widest text-indigo-700 uppercase mb-1">Registo de Formação em Segurança</p>
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{course.title}</h1>
                            {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                            <div className="text-xs text-gray-400">Impresso em</div>
                            <div className="text-xs font-semibold text-gray-600">{printDate}</div>
                        </div>
                    </div>
                </div>

                {/* ── Session Info Grid ── */}
                <section className="mb-8">
                    <h2 className="text-xs font-bold tracking-widest text-indigo-700 uppercase mb-3">Dados da Sessão</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm border border-gray-200 rounded-lg p-4 bg-gray-50">
                        {[
                            ['Projeto', project?.name || session.projectId],
                            ['Data da Sessão', sessionDate],
                            ['Local', session.location || '—'],
                            ['Concluída em', completedDate],
                            ['Nº de Inscritos', session.enrolledWorkers.length.toString()],
                            ['Presenças', `${attendees.length} de ${session.enrolledWorkers.length}`],
                            ['Tipo de Curso', course.type.replace('_', ' ')],
                            ['Duração Estimada', course.estimatedDuration ? `${course.estimatedDuration} min` : '—'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                                <span className="text-gray-800 font-medium mt-0.5">{value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Course Content Summary ── */}
                {course.slides.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xs font-bold tracking-widest text-indigo-700 uppercase mb-3">Conteúdo Programático</h2>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-8">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Título</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {course.slides.map((slide, i) => {
                                        const typeMap: Record<string, string> = { cover: 'Capa', content: 'Conteúdo', list: 'Lista', question: 'Pergunta', summary: 'Resumo', image: 'Imagem' };
                                        return (
                                            <tr key={slide.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2 font-medium text-gray-800">{slide.title}</td>
                                                <td className="px-4 py-2 text-gray-500 text-xs">{typeMap[slide.type] || slide.type}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── Attendance & Signatures ── */}
                <section className="mb-8">
                    <h2 className="text-xs font-bold tracking-widest text-indigo-700 uppercase mb-3">
                        Presenças e Assinaturas ({attendees.length})
                    </h2>
                    {attendees.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Nenhum trabalhador presente registado.</p>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-8">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Nome</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Função</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Hora</th>
                                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase w-40">Assinatura</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendees.map((att, i) => {
                                        const w = getWorker(att.workerId);
                                        const signTime = att.signedAt ? new Date(att.signedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—';
                                        return (
                                            <tr key={att.workerId} style={{ pageBreakInside: 'avoid' }}>
                                                <td className="px-4 py-3 text-gray-400 text-xs align-top">{i + 1}</td>
                                                <td className="px-4 py-3 align-top">
                                                    <p className="font-semibold text-sm text-gray-900">{w?.name || att.workerId}</p>
                                                    {w?.nif && <p className="text-xs text-gray-400">NIF: {w.nif}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500 align-top">{w?.role || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 align-top">{signTime}</td>
                                                <td className="px-4 py-3 text-center align-middle">
                                                    {att.signatureImageBase64 ? (
                                                        <img
                                                            src={att.signatureImageBase64}
                                                            alt={`Assinatura de ${w?.name}`}
                                                            className="max-h-12 mx-auto border border-gray-200 rounded"
                                                            style={{ maxWidth: '140px', background: '#fff' }}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-300 italic">sem assinatura</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ── Absences ── */}
                {absentees.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xs font-bold tracking-widest text-red-500 uppercase mb-3">Ausentes ({absentees.length})</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {absentees.map(wId => {
                                const w = getWorker(wId);
                                return (
                                    <div key={wId} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                        <span className="w-4 h-4 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">✕</span>
                                        <span className="text-sm text-gray-700">{w?.name || wId}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Footer / Declaration ── */}
                <section className="mt-12 pt-6 border-t border-gray-300">
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                        O presente registo certifica que a formação indicada foi realizada na data descrita, com as presenças e assinaturas constantes neste documento.<br />
                        Documento gerado pela plataforma SafeSite · {printDate}
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-8">
                        <div className="border-t border-gray-400 pt-3 text-center">
                            <p className="text-xs text-gray-500">Assinatura do Formador</p>
                            {presenter && <p className="text-xs font-medium text-gray-700 mt-1">{presenter.name}</p>}
                        </div>
                        <div className="border-t border-gray-400 pt-3 text-center">
                            <p className="text-xs text-gray-500">Responsável de Segurança (SHST)</p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
