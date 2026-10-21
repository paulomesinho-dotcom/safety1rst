'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const updateSubscriptionRequest = useStore(state => state.updateSubscriptionRequest);
    const subscriptionRequests = useStore(state => state.subscriptionRequests);
    const users = useStore(state => state.users);
    const addAccount = useStore(state => state.addAccount);
    const addUser = useStore(state => state.addUser);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [details, setDetails] = useState<{ companyName: string; plan: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('O link de verificação é inválido ou está em falta.');
            return;
        }

        const verify = async () => {
            try {
                // 1. Tentar verificar via API backend
                const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (res.ok && data.success) {
                    const verifiedPlan = data.plan || 'free';
                    setStatus('success');
                    setDetails({
                        companyName: data.companyName,
                        plan: verifiedPlan,
                    });

                    // Sincronizar store local se for conta gratuita
                    const localReq = subscriptionRequests.find(r => r.verificationToken === token);
                    if (localReq) {
                        updateSubscriptionRequest(localReq.id, {
                            status: verifiedPlan === 'free' ? 'approved' : 'pending_approval',
                            emailVerifiedAt: new Date().toISOString(),
                        });
                        if (verifiedPlan === 'free') {
                            const userExists = users.some(u => u.email?.trim().toLowerCase() === localReq.email.trim().toLowerCase());
                            if (!userExists) {
                                const newAccId = `acc_${localReq.id}`;
                                addAccount({
                                    id: newAccId,
                                    name: localReq.companyName,
                                    vatNumber: localReq.nif,
                                    contactEmail: localReq.email,
                                    plan: 'free',
                                    status: 'active',
                                    subscriptionStatus: 'active',
                                    maxProjects: 0,
                                    accessControlLimit: 600,
                                    maxCompanyUsers: 1,
                                    modules: ['companies', 'workers', 'equipment', 'access-control'],
                                });
                                addUser({
                                    id: `usr_${localReq.id}`,
                                    accountId: newAccId,
                                    name: localReq.contactName,
                                    email: localReq.email,
                                    password: localReq.password,
                                    role: 'client_admin',
                                    projectAccess: [],
                                });
                            }
                        }
                    }
                } else {
                    // Fallback para estado do client store (se demo ou offline)
                    const localReq = subscriptionRequests.find(r => r.verificationToken === token);
                    if (localReq) {
                        const isFree = localReq.plan === 'free' || !localReq.plan;
                        updateSubscriptionRequest(localReq.id, {
                            status: isFree ? 'approved' : 'pending_approval',
                            emailVerifiedAt: new Date().toISOString(),
                        });
                        if (isFree) {
                            const userExists = users.some(u => u.email?.trim().toLowerCase() === localReq.email.trim().toLowerCase());
                            if (!userExists) {
                                const newAccId = `acc_${localReq.id}`;
                                addAccount({
                                    id: newAccId,
                                    name: localReq.companyName,
                                    vatNumber: localReq.nif,
                                    contactEmail: localReq.email,
                                    plan: 'free',
                                    status: 'active',
                                    subscriptionStatus: 'active',
                                    maxProjects: 0,
                                    accessControlLimit: 600,
                                    maxCompanyUsers: 1,
                                    modules: ['companies', 'workers', 'equipment', 'access-control'],
                                });
                                addUser({
                                    id: `usr_${localReq.id}`,
                                    accountId: newAccId,
                                    name: localReq.contactName,
                                    email: localReq.email,
                                    password: localReq.password,
                                    role: 'client_admin',
                                    projectAccess: [],
                                });
                            }
                        }
                        setStatus('success');
                        setDetails({
                            companyName: localReq.companyName,
                            plan: localReq.plan,
                        });
                    } else {
                        setStatus('error');
                        setErrorMessage(data.error || 'Não foi possível validar este token de verificação.');
                    }
                }
            } catch (err: any) {
                // Fallback para client store
                const localReq = subscriptionRequests.find(r => r.verificationToken === token);
                if (localReq) {
                    const isFree = localReq.plan === 'free' || !localReq.plan;
                    updateSubscriptionRequest(localReq.id, {
                        status: isFree ? 'approved' : 'pending_approval',
                        emailVerifiedAt: new Date().toISOString(),
                    });
                    if (isFree) {
                        const userExists = users.some(u => u.email?.trim().toLowerCase() === localReq.email.trim().toLowerCase());
                        if (!userExists) {
                            const newAccId = `acc_${localReq.id}`;
                            addAccount({
                                id: newAccId,
                                name: localReq.companyName,
                                vatNumber: localReq.nif,
                                contactEmail: localReq.email,
                                plan: 'free',
                                status: 'active',
                                subscriptionStatus: 'active',
                                maxProjects: 0,
                                accessControlLimit: 600,
                                maxCompanyUsers: 1,
                                modules: ['companies', 'workers', 'equipment', 'access-control'],
                            });
                            addUser({
                                id: `usr_${localReq.id}`,
                                accountId: newAccId,
                                name: localReq.contactName,
                                email: localReq.email,
                                password: localReq.password,
                                role: 'client_admin',
                                projectAccess: [],
                            });
                        }
                    }
                    setStatus('success');
                    setDetails({
                        companyName: localReq.companyName,
                        plan: localReq.plan,
                    });
                } else {
                    setStatus('error');
                    setErrorMessage('Erro de ligação ao servidor. Tente novamente mais tarde.');
                }
            }
        };

        verify();
    }, [token, subscriptionRequests, updateSubscriptionRequest, users, addAccount, addUser]);

    const isFreePlan = !details?.plan || details.plan === 'free';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center px-4 py-12">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                {status === 'loading' && (
                    <div className="py-12 space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">A verificar o seu endereço de email...</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Por favor aguarde um momento enquanto validamos o seu pedido.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 py-4">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 size={36} />
                        </div>

                        {isFreePlan ? (
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3">
                                    Email Confirmado
                                </span>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Conta Ativada com Sucesso</h1>
                                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    O seu endereço de email foi verificado. A sua conta está pronta e já pode aceder ao Workplace da plataforma.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3">
                                    Email Confirmado
                                </span>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedido em Análise</h1>
                                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {details?.companyName ? (
                                        <>O pedido de adesão para <strong>{details.companyName}</strong> (Plano {details.plan.toUpperCase()}) foi encaminhado com sucesso para a nossa equipa.</>
                                    ) : (
                                        <>O seu email foi confirmado com sucesso e o pedido de adesão foi registado.</>
                                    )}
                                </p>
                            </div>
                        )}

                        {!isFreePlan && (
                            <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-left text-xs text-slate-600 dark:text-slate-300 space-y-2">
                                <div className="flex items-start gap-2.5">
                                    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                    <span>A nossa administração irá verificar os dados e ativar a sua subscrição.</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                    <span>Receberá um email automático assim que o seu acesso estiver pronto a utilizar.</span>
                                </div>
                            </div>
                        )}

                        <Link
                            href="/login?verified=true"
                            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition-all text-sm"
                        >
                            Ir para o Login <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6 py-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <AlertCircle size={36} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verificação Inválida</h1>
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium transition-all text-sm"
                        >
                            Voltar à Entrada
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
