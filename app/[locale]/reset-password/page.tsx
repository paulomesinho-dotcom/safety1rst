'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('O link de recuperação é inválido ou está em falta.');
            return;
        }

        if (password.length < 8) {
            setError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As palavras-passe introduzidas não coincidem.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Não foi possível redefinir a palavra-passe.');
                return;
            }

            setIsSuccess(true);
        } catch (err: any) {
            console.error('[Reset-Password Error]:', err);
            setError('Erro de ligação ao servidor. Por favor tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Link Inválido</h2>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                    O link de recuperação de palavra-passe não é válido ou já expirou.
                </p>
                <div className="pt-2">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Voltar ao Login
                    </Link>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Palavra-passe Alterada</h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    A sua palavra-passe foi atualizada com sucesso. Já pode iniciar sessão na plataforma com as suas novas credenciais.
                </p>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
                    >
                        Iniciar Sessão <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center pb-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Redefinir Palavra-passe</h2>
                <p className="text-xs text-gray-500 mt-1">
                    Introduza a sua nova palavra-passe de acesso.
                </p>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Nova Palavra-passe * (mín. 8 caracteres)
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="password"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-800"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Confirmar Nova Palavra-passe *
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="password"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-800"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="text-red-600 text-xs bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>A atualizar palavra-passe...</span>
                    </>
                ) : (
                    <span>Guardar Nova Palavra-passe</span>
                )}
            </button>

            <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-blue-600 hover:underline font-medium">
                    Cancelar e voltar ao login
                </Link>
            </div>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center px-4 py-12">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 animate-in fade-in zoom-in-95 duration-500">
                <Suspense fallback={
                    <div className="py-12 text-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-500">A carregar formulário...</p>
                    </div>
                }>
                    <ResetPasswordContent />
                </Suspense>
            </div>
        </div>
    );
}
