'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Shield, Mail, Lock, Building2, ArrowRight, Box, Smartphone, CheckCircle, FileText, HardHat, Truck, Check, Sparkles, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PrimaryButton, Modal } from '@/components/Modal';
import { BrandLogo } from '@/components/BrandLogo';
import type { PlanType } from '@/types';
import { nanoid } from 'nanoid';

export default function LoginPage() {
    const router = useRouter();
    const { users, setCurrentUser, login, addSubscriptionRequest, addAccount, addUser } = useStore();
    const [isLogin, setIsLogin] = useState(true);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');

    // Register State
    const [regData, setRegData] = useState({
        name: '',
        email: '',
        nif: '',
        password: '',
    });
    const [consentRgpd, setConsentRgpd] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [regError, setRegError] = useState('');

    // Force safety theme on login page regardless of global ThemeProvider state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            const body = document.body;

            const enforceTheme = () => {
                root.setAttribute('data-color', 'safety');
                root.classList.remove('dark');
                root.classList.add('light');
                body.classList.remove('dark');
                body.classList.add('light');
            };

            enforceTheme();

            // Aggressively prevent any other script or hydration from changing it back
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' || mutation.attributeName === 'data-color') {
                        const hasDark = root.classList.contains('dark') || body.classList.contains('dark');
                        const isNotSafety = root.getAttribute('data-color') !== 'safety';
                        if (hasDark || isNotSafety) {
                            enforceTheme();
                        }
                    }
                });
            });

            observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-color'] });
            observer.observe(body, { attributes: true, attributeFilter: ['class'] });

            return () => observer.disconnect();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password) {
            setError('Por favor preencha o e-mail e a palavra-passe.');
            return;
        }

        const success = await login(email.trim(), password);

        if (success) {
            router.push('/');
        } else {
            setError('E-mail ou palavra-passe incorretos.');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegError('');

        if (!regData.name.trim() || !regData.email.trim() || !regData.nif.trim() || !regData.password) {
            setRegError('Por favor preencha todos os campos obrigatórios.');
            return;
        }

        if (regData.password.length < 8) {
            setRegError('A palavra-passe deve ter pelo menos 8 caracteres.');
            return;
        }
        if (!/[A-Z]/.test(regData.password)) {
            setRegError('A palavra-passe deve conter pelo menos 1 letra maiúscula.');
            return;
        }
        if (!/[0-9]/.test(regData.password)) {
            setRegError('A palavra-passe deve conter pelo menos 1 número.');
            return;
        }
        if (!/[^A-Za-z0-9]/.test(regData.password)) {
            setRegError('A palavra-passe deve conter pelo menos 1 caráter especial.');
            return;
        }

        if (!consentRgpd) {
            setRegError('É necessário autorizar o tratamento de dados pessoais (RGPD) para criar a sua conta.');
            return;
        }

        const emailClean = regData.email.trim().toLowerCase();
        const existing = users.find(u => u.email?.trim().toLowerCase() === emailClean);
        if (existing) {
            setRegError('Já existe um utilizador registado com este endereço de email.');
            return;
        }

        setIsSubmitting(true);
        const newAccountId = `acc_${nanoid(8)}`;
        const newUserId = `usr_${nanoid(8)}`;

        try {
            // 1. Criar a conta / tenant com plano inicial gratuito
            addAccount({
                id: newAccountId,
                name: `Empresa (${regData.nif.trim()})`,
                vatNumber: regData.nif.trim(),
                contactEmail: emailClean,
                contactPhone: undefined,
                plan: 'free',
                status: 'active',
                subscriptionStatus: 'active',
                maxProjects: 0,
                accessControlLimit: 600,
                maxCompanyUsers: 1,
                modules: ['companies', 'workers', 'equipment', 'access-control'],
            });

            // 2. Criar o utilizador associado à conta
            addUser({
                id: newUserId,
                accountId: newAccountId,
                name: regData.name.trim(),
                email: emailClean,
                phone: undefined,
                password: regData.password,
                role: 'client_admin',
                projectAccess: [],
            });

            // 3. Sincronizar com a API em background (com fallback graceful)
            try {
                await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: regData.name.trim(),
                        email: emailClean,
                        password: regData.password,
                        nif: regData.nif.trim(),
                        tenantName: `Empresa (${regData.nif.trim()})`,
                    }),
                });
            } catch (apiErr) {
                console.warn('[Auth] Server sync fallback:', apiErr);
            }

            // 4. Iniciar sessão imediatamente e avançar para o Workplace
            const loggedIn = await login(emailClean, regData.password);
            if (loggedIn) {
                router.push('/');
            } else {
                setIsLogin(true);
                setEmail(emailClean);
            }
        } catch (err: any) {
            console.error('[Register] Error:', err);
            setRegError('Ocorreu um erro ao criar a conta. Por favor tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');

        const cleanEmail = forgotEmail.trim().toLowerCase();
        if (!cleanEmail) {
            setForgotError('Por favor insira o seu endereço de email.');
            return;
        }

        setForgotLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Se a API indicar que não existe ou erro no envio
                const existsLocally = users.some(u => u.email?.trim().toLowerCase() === cleanEmail);
                if (res.status === 404 && !existsLocally) {
                    setForgotError('Este endereço de email não se encontra registado na plataforma.');
                    return;
                }
                setForgotError(data.error || 'Não foi possível processar a recuperação de palavra-passe.');
                return;
            }

            setForgotSent(true);
        } catch (err: any) {
            console.error('[Forgot Password Error]:', err);
            const existsLocally = users.some(u => u.email?.trim().toLowerCase() === cleanEmail);
            if (!existsLocally) {
                setForgotError('Este endereço de email não se encontra registado na plataforma.');
            } else {
                setForgotError('Erro de ligação ao servidor para envio do email. Por favor tente novamente.');
            }
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div id="login-page" className="login-page min-h-screen bg-background flex flex-col" style={{
            '--primary': '26 115 232',
            '--primary-hover': '21 87 176',
            '--primary-light': '232 240 254',
            '--background': '248 250 252',
            '--surface': '255 255 255',
            '--content-text': '32 33 36',
        } as React.CSSProperties}>

            {/* Navbar */}
            <nav className="bg-white dark:bg-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-[#444746] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo removed from header as requested */}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs font-medium text-gray-500">
                            Safety Management Platform v2.0
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow">
                {/* Hero Section */}
                <div className="relative overflow-hidden bg-white dark:bg-surface pb-16 lg:pb-24 pt-10">
                    <div className="absolute inset-0 bg-primary-light/50 -skew-y-3 transform origin-top-left z-0 scale-110"></div>

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">

                        {/* Left: Value Prop */}
                        <div className="space-y-8 animate-in slide-in-from-left-10 duration-700">
                            <div>
                                <div className="flex items-center gap-4 mb-8">
                                    <img src="/safetyfirst-logo.png" className="w-20 h-20 object-cover rounded-2xl shadow-lg" alt="SafetyFirst Logo" />
                                    <BrandLogo className="text-4xl" />
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-heading font-semibold text-gray-900 dark:text-white leading-tight">
                                    Safety Management <br />
                                    <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Reimagined.</span>
                                </h1>
                                <p className="mt-4 text-xl text-gray-500 max-w-lg">
                                    The complete platform for construction safety. Manage documents, workers, and compliance in one secure place.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 text-green-700 rounded-lg"><CheckCircle size={20} /></div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">Compliance</h4>
                                        <p className="text-sm text-gray-500">Auto-track document expiry</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><FileText size={20} /></div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">Smart Plans</h4>
                                        <p className="text-sm text-gray-500">Centralized documentation</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Login Card */}
                        <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-[#444746] relative overflow-hidden animate-in slide-in-from-right-10 duration-700">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
                                {isLogin ? 'Iniciar Sessão' : 'Criar Conta'}
                            </h2>

                            {isLogin ? (
                                <form className="space-y-5" onSubmit={handleLogin}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">E-mail</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email" required
                                                className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-[#444746] rounded-lg py-2.5 border focus:ring-2 focus:ring-primary focus:border-blue-500 transition-all outline-none"
                                                value={email} onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Palavra-passe</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForgotEmail(email);
                                                    setForgotSent(false);
                                                    setForgotError('');
                                                    setShowForgotModal(true);
                                                }}
                                                className="text-xs text-primary hover:underline font-medium"
                                            >
                                                Esqueceu-se da palavra-passe?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password" required
                                                className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-[#444746] rounded-lg py-2.5 border focus:ring-2 focus:ring-primary focus:border-blue-500 transition-all outline-none"
                                                value={password} onChange={e => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md border border-red-100 flex items-center gap-2"><Shield size={14} /> {error}</div>}

                                    <PrimaryButton type="submit" className="w-full justify-center py-2.5 text-base shadow-lg shadow-primary/20">
                                        Entrar <ArrowRight size={18} className="ml-2" />
                                    </PrimaryButton>

                                    <p className="text-center text-sm text-gray-500 mt-4">
                                        Não tem conta? <button type="button" onClick={() => setIsLogin(false)} className="font-semibold text-primary hover:text-primary hover:underline">Criar conta</button>
                                    </p>
                                </form>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="text-center pb-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Preencha os dados da sua empresa para criar a sua conta de acesso ao Workplace.
                                        </p>
                                    </div>

                                    {/* Register Form */}
                                    <form onSubmit={handleRegister} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                                            <div className="relative">
                                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text" required
                                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    value={regData.name}
                                                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                            <div className="relative">
                                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="email" required
                                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    value={regData.email}
                                                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">NIF da empresa *</label>
                                            <div className="relative">
                                                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text" required
                                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    value={regData.nif}
                                                    onChange={e => setRegData({ ...regData, nif: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Palavra-passe * <span className="text-[10px] text-gray-500 font-normal">(mínimo 8 caracteres, 1 letra maiúscula, 1 número, 1 caráter especial)</span>
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="password" required
                                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    value={regData.password}
                                                    onChange={e => setRegData({ ...regData, password: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* RGPD / Consentimento de Tratamento de Dados */}
                                        <div className="pt-1.5 pb-1">
                                            <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    checked={consentRgpd}
                                                    onChange={e => setConsentRgpd(e.target.checked)}
                                                    className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 shrink-0"
                                                />
                                                <span className="leading-tight text-[11px]">
                                                    Autorizo a recolha e o tratamento dos meus dados pessoais (nome e email) pela <strong>XISPOLI / Safety1irst</strong> para efeitos de criação de conta, gestão de acessos e suporte aos utilizadores.{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPrivacyModal(true)}
                                                        className="text-primary underline font-semibold hover:text-blue-700 inline"
                                                    >
                                                        Proteção de Dados & RGPD
                                                    </button>
                                                </span>
                                            </label>
                                        </div>

                                        {regError && (
                                            <div className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span>{regError}</span>
                                            </div>
                                        )}

                                        <PrimaryButton
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full justify-center py-2.5 text-sm mt-3 shadow-md shadow-primary/20"
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 size={16} className="animate-spin" /> A criar conta...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    Criar Conta e Aceder ao Workplace <ArrowRight size={16} />
                                                </span>
                                            )}
                                        </PrimaryButton>
                                    </form>

                                    <p className="text-center text-xs text-gray-500 pt-1">
                                        Já tem uma conta de acesso?{' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRegError('');
                                                setIsLogin(true);
                                            }}
                                            className="font-semibold text-primary hover:underline"
                                        >
                                            Iniciar Sessão
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="bg-white dark:bg-surface py-16 border-t border-gray-100 dark:border-[#444746]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h3 className="text-base font-semibold text-primary uppercase tracking-wide">Capabilities</h3>
                            <h2 className="mt-2 text-3xl font-heading font-medium text-gray-900 dark:text-white">Everything you need to stay safe</h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-gray-50 dark:bg-[#131314] rounded-xl p-6 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-primary-light text-primary rounded-lg flex items-center justify-center mb-4">
                                    <HardHat size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Worker Management</h3>
                                <p className="text-gray-600 dark:text-gray-300">Digital ID cards with QR codes. Track qualifications, medical exams, and training records in real-time.</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#131314] rounded-xl p-6 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Document Control</h3>
                                <p className="text-gray-600 dark:text-gray-300">Automated expiration tracking for insurance and licenses. Never miss a compliance deadline again.</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#131314] rounded-xl p-6 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-4">
                                    <Truck size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Equipment & Assets</h3>
                                <p className="text-gray-600 dark:text-gray-300">Log inspections and maintenance. Associate equipment with workers and track active assets on site.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* The Future: BIM SECTION */}
                <div className="bg-slate-900 text-white py-20 relative overflow-hidden">
                    {/* Abstract Background Element */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="lg:flex items-center gap-16">
                            <div className="lg:w-1/2 mb-10 lg:mb-0">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-primary/30 text-blue-300 text-sm font-bold uppercase tracking-wider mb-6">
                                    Coming Soon: Safety 4.0
                                </span>
                                <h2 className="text-4xl md:text-5xl font-heading font-medium mb-6 leading-tight !text-white">
                                    Safety meets <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">BIM Integration</span>
                                </h2>
                                <p className="!text-slate-300 text-lg mb-8 leading-relaxed">
                                    The next evolution of safety management connects your data directly to the 3D Building Model (IFC).
                                    Visualize risks, plan emergency routes, and link documentation to physical objects before ground is even broken.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-surface/10 rounded-full flex items-center justify-center text-primary">
                                            <Box size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold !text-white">3D Risk Visualization</h4>
                                            <p className="text-sm !text-slate-300">See hazards in the context of the digital twin.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-surface/10 rounded-full flex items-center justify-center text-teal-400">
                                            <Smartphone size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold !text-white">Mobile Augmented Reality</h4>
                                            <p className="text-sm !text-slate-300">Verify installations against the model on-site.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-1/2 relative">
                                {/* Visual Representation of BIM/3D */}
                                <div className="relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-2 shadow-2xl">
                                    <div className="rounded-xl overflow-hidden relative aspect-video bg-slate-950 flex items-center justify-center group">
                                        {/* Grid lines to simulate 3D space */}
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

                                        {/* Abstract Building Shape */}
                                        <div className="relative z-10 opacity-80 transform group-hover:scale-105 transition-transform duration-700">
                                            <Box size={140} className="text-primary drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]" strokeWidth={0.5} />
                                        </div>

                                        <div className="absolute bottom-6 right-6 bg-slate-800/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-600 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-xs font-mono !text-slate-300">IFC MODEL LOADED</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="bg-white dark:bg-surface border-t border-gray-200 dark:border-[#444746] py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                        &copy; 2026 SafetyFirst. All rights reserved. <br className="sm:hidden" /> Built for the construction industry.
                    </div>
                </footer>
            </main>

            {/* Modal de Informação RGPD */}
            <Modal
                title="Informação sobre Proteção de Dados (RGPD)"
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
            >
                <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                    <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                        <p className="font-semibold text-xs mb-1">Em conformidade com o Regulamento Geral sobre a Proteção de Dados (Regulamento (UE) 2016/679):</p>
                        <p>O tratamento dos seus dados rege-se pelos princípios da licitude, lealdade, transparência e minimização.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Responsável pelo Tratamento</h4>
                        <p>A entidade responsável pelo tratamento dos seus dados é a <strong>XISPOLI - Engenharia, Lda.</strong>, titular e administradora da plataforma <strong>SafetyFirst</strong>.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Finalidade e Base de Licitude</h4>
                        <p>Os dados recolhidos (Nome, Empresa, NIF e Email) destinam-se exclusivamente a:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Processar e validar a sua conta e acesso ao Workplace (diligências pré-contratuais — Art. 6.º, n.º 1, al. b) do RGPD);</li>
                            <li>Comunicação e suporte direto aos utilizadores da plataforma (consentimento — Art. 6.º, n.º 1, al. a) do RGPD);</li>
                            <li>Envio de notificações de segurança, recuperação de conta e validação de acessos.</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Prazo de Conservação</h4>
                        <p>Os dados são conservados durante o período necessário ao processamento da adesão. Caso o acesso seja ativado, os dados permanecem vinculados à conta durante a vigência do serviço e respetivos prazos legais fiscais. Se o pedido não for concretizado, os dados são eliminados no prazo máximo de 90 dias.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">4. Confidencialidade e Terceiros</h4>
                        <p>Garantimos a total confidencialidade dos seus dados. Os seus dados não são vendidos, partilhados ou cedidos a terceiros para fins publicitários ou comerciais alheios à plataforma.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">5. Exercício dos Seus Direitos</h4>
                        <p>Nos termos da lei, pode a qualquer momento exercer os seus direitos de acesso, retificação, oposição, limitação e eliminação dos seus dados, ou revogar o seu consentimento, bastando enviar uma mensagem para o email: <strong className="text-primary font-semibold">paulo.ferreira@xispoli.eu</strong>.</p>
                    </div>

                    <div className="pt-2 text-right">
                        <button
                            type="button"
                            onClick={() => setShowPrivacyModal(false)}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Recuperação de Palavra-passe */}
            <Modal
                title="Recuperar Palavra-passe"
                isOpen={showForgotModal}
                onClose={() => setShowForgotModal(false)}
            >
                {forgotSent ? (
                    <div className="space-y-4 py-2 text-center">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Email Enviado com Sucesso</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                                Enviámos uma mensagem para <strong>{forgotEmail}</strong> com o link seguro para redefinir a sua palavra-passe.
                            </p>
                            <p className="text-[11px] text-gray-500 mt-2">
                                Por favor verifique a sua caixa de entrada e pasta de correio não solicitado (spam).
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForgotModal(false)}
                                className="w-full py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors"
                            >
                                Voltar ao Início de Sessão
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4 py-1">
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            Insira o seu endereço de email associado à sua conta. Receberá uma mensagem com as instruções para definir uma nova palavra-passe.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {forgotError && (
                            <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1.5">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{forgotError}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForgotModal(false)}
                                className="px-3.5 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <PrimaryButton
                                type="submit"
                                disabled={forgotLoading}
                                className="text-xs py-2 px-4"
                            >
                                {forgotLoading ? (
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 size={13} className="animate-spin" /> A enviar...
                                    </span>
                                ) : (
                                    'Enviar Instruções'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

