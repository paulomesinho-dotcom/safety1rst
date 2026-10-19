'use client';

import React from 'react';
import { Download, ArrowLeft, Shield, Layout, Users, FileText, CheckCircle, Truck, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generatePDF } from '@/lib/pdf-utils';

export default function ManualPage() {
    const router = useRouter();

    const handleDownload = () => {
        generatePDF('manual-content', 'SafetyFirst_Manual_Utilizador.pdf');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
            {/* Header / Controls */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-8 no-print">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Voltar</span>
                </button>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm font-medium"
                >
                    <Download size={18} />
                    <span>Descarregar PDF</span>
                </button>
            </div>

            {/* Manual Content (A4-ish container) */}
            <div
                id="manual-content"
                className="w-full max-w-[210mm] bg-white dark:bg-surface shadow-lg p-0 text-gray-800 dark:text-gray-100 leading-relaxed overflow-hidden"
                style={{ minHeight: '297mm' }}
            >
                {/* Cover Page */}
                <div className="relative h-[297mm] flex flex-col text-white bg-slate-900">
                    {/* Banner Image Place - Using a gradient placeholder if image fails, but designed for the generated asset */}
                    <div className="absolute top-0 left-0 w-full h-[50%] z-0">
                        <img
                            src="/manual-banner.png"
                            alt="Background"
                            className="w-full h-full object-cover opacity-50 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/95"></div>
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col justify-center px-16 mt-20">
                        <div className="mb-6 flex items-center gap-4">
                            <Shield size={64} className="text-primary" />
                            <h1 className="text-6xl font-bold tracking-tight">SafetyFirst</h1>
                        </div>
                        <h2 className="text-3xl font-light text-blue-100 mb-12 max-w-2xl">
                            O Futuro da Gestão de Segurança na Construção Civil
                        </h2>
                        <div className="w-24 h-1 bg-primary-light0 mb-12"></div>
                        <p className="text-xl text-gray-300 max-w-xl">
                            Manual de Utilizador
                            <br />
                            <span className="text-base opacity-75">Versão 1.0 • 2026</span>
                        </p>
                    </div>

                    <div className="relative z-10 bg-white dark:bg-surface text-gray-900 dark:text-white p-16">
                        <h3 className="text-2xl font-bold mb-4">Bem-vindo à Revolução Digital</h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                            O <b>SafetyFirst</b> não é apenas uma plataforma de gestão; é o seu parceiro digital para garantir a conformidade, segurança e eficiência em obra.
                        </p>
                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary-light rounded-lg text-primary"><CheckCircle size={24} /></div>
                                <div>
                                    <h4 className="font-semibold">Conformidade Total</h4>
                                    <p className="text-sm text-gray-500">Gestão documental centralizada e validação automática de requisitos legais.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary-light rounded-lg text-primary"><Users size={24} /></div>
                                <div>
                                    <h4 className="font-semibold">Colaboração em Tempo Real</h4>
                                    <p className="text-sm text-gray-500">Conecte equipas, subempreiteiros e gestores numa única plataforma.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page 2: Getting Started & Dashboard */}
                <div className="p-16 min-h-[297mm] break-before-page">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 border-b pb-4">Começar a Usar</h2>

                    <div className="mb-12">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <Layout size={24} /> O Seu Painel de Controlo
                        </h3>
                        <p className="mb-4">
                            Ao entrar no SafetyFirst, será recebido pelo seu <b>Painel Pessoal</b>. Aqui tem acesso imediato a todas as obras onde está alocado.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">
                            <li><b>Workspaces:</b> Visualize os seus projetos ativos.</li>
                            <li><b>Códigos de Convite:</b> Utilize o botão "Enter Code" para se juntar a novas obras rapidamente.</li>
                            <li><b>Estado do Projeto:</b> Ícones intuitivos indicam se um projeto está Ativo ou Arquivado.</li>
                        </ul>
                    </div>

                    <div className="mb-12">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <Users size={24} /> Gestão de Entidades
                        </h3>
                        <p className="mb-4">
                            Dentro de cada projeto, o menu <b>Companies</b> é o coração da gestão administrativa.
                        </p>
                        <div className="bg-gray-50 dark:bg-[#131314] p-6 rounded-xl border border-gray-100 dark:border-[#444746]">
                            <h4 className="font-semibold mb-2">Fluxo de Aprovação</h4>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="px-3 py-1 bg-gray-200 rounded-full text-gray-700 dark:text-gray-200">Rascunho</span>
                                <span className="text-gray-400">→</span>
                                <span className="px-3 py-1 bg-yellow-100 rounded-full text-yellow-800">Validação Pendente</span>
                                <span className="text-gray-400">→</span>
                                <span className="px-3 py-1 bg-green-100 rounded-full text-green-800">Aprovado</span>
                            </div>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                                Como Gestor, pode solicitar documentação aos subempreiteiros, que receberão notificações para carregar os ficheiros necessários diretamente na plataforma.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Page 3: Features Deep Dive */}
                <div className="p-16 min-h-[297mm] break-before-page bg-gray-50 dark:bg-[#131314]">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 border-b pb-4">Módulos Principais</h2>

                    <div className="grid grid-cols-1 gap-12">
                        <section className="bg-white dark:bg-surface p-8 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                            <div className="flex items-center gap-3 mb-4 text-indigo-600">
                                <Truck size={32} />
                                <h3 className="text-2xl font-bold">Gestão de Equipamentos</h3>
                            </div>
                            <p className="mb-4">
                                Mantenha o controlo rigoroso de todas as máquinas e equipamentos em obra. O SafetyFirst permite associar equipamentos a empresas específicas e monitorizar a validade das inspeções e seguros.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Registo detalhado por projeto</li>
                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Alertas de documentos expirados</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-surface p-8 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                            <div className="flex items-center gap-3 mb-4 text-rose-600">
                                <FileText size={32} />
                                <h3 className="text-2xl font-bold">Documentação Inteligente</h3>
                            </div>
                            <p className="mb-4">
                                Diga adeus ao papel. O nosso sistema de ficheiros inteligente organiza tudo automaticamente.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Upload "Drag & Drop"</li>
                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Pré-visualização de PDFs integrada</li>
                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Histórico de versões</li>
                            </ul>
                        </section>

                        <section className="bg-white dark:bg-surface p-8 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                            <div className="flex items-center gap-3 mb-4 text-emerald-600">
                                <Database size={32} />
                                <h3 className="text-2xl font-bold">Segurança de Dados</h3>
                            </div>
                            <p className="mb-4">
                                A sua informação está protegida com os mais altos padrões de segurança. Backups automáticos e controlo de acessos baseado em funções (RBAC) garantem que apenas as pessoas certas têm acesso à informação sensível.
                            </p>
                        </section>
                    </div>

                    <div className="mt-16 text-center text-gray-400 text-sm">
                        <p>SafetyFirst © 2026. Todos os direitos reservados.</p>
                        <p>www.safesite-app.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
