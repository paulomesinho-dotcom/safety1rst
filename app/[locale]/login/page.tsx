'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Shield, Mail, Lock, Building2, ArrowRight, Box, Smartphone, CheckCircle, FileText, HardHat, Truck, Check, Sparkles, Phone, User, CheckCircle2, AlertCircle, Loader2, Download, Share2, PlusSquare, Laptop, HelpCircle } from 'lucide-react';
import { PrimaryButton, Modal } from '@/components/Modal';
import { BrandLogo } from '@/components/BrandLogo';
import type { PlanType } from '@/types';
import { nanoid } from 'nanoid';

export default function LoginPage() {
    const router = useRouter();
    const { users, setCurrentUser, login, addSubscriptionRequest } = useStore();
    const [isLogin, setIsLogin] = useState(true);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Register State
    const [regData, setRegData] = useState({
        name: '',
        companyName: '',
        nif: '',
        email: '',
        phone: '',
        password: '',
        plan: 'basic' as PlanType,
    });
    const [consentRgpd, setConsentRgpd] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const [regError, setRegError] = useState('');

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);

    // Monitor PWA installation status & beforeinstallprompt event
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if running in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isInstalled) {
            alert('A aplicação Safety1irst já se encontra instalada no seu dispositivo.');
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
            return;
        }

        // If beforeinstallprompt hasn't fired or on iOS/Safari, show the instructions modal
        setShowInstallModal(true);
    };

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

        if (!regData.name.trim() || !regData.companyName.trim() || !regData.nif.trim() || !regData.email.trim() || !regData.password) {
            setRegError('Por favor preencha todos os campos obrigatórios.');
            return;
        }

        if (regData.password.length < 8) {
            setRegError('A palavra-passe deve ter pelo menos 8 caracteres.');
            return;
        }

        if (!consentRgpd) {
            setRegError('É necessário autorizar o tratamento de dados pessoais (RGPD) para submeter o pedido.');
            return;
        }

        setIsSubmitting(true);
        const verificationToken = nanoid(32);

        try {
            // Guardar no client store (garante reatividade local/WASM)
            addSubscriptionRequest({
                companyName: regData.companyName.trim(),
                nif: regData.nif.trim(),
                contactName: regData.name.trim(),
                email: regData.email.trim().toLowerCase(),
                phone: regData.phone.trim() || undefined,
                password: regData.password,
                plan: regData.plan,
                status: 'pending_email',
                verificationToken,
            });

            // Enviar pedido à API (que envia o email por Resend)
            const res = await fetch('/api/auth/register-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: regData.companyName.trim(),
                    nif: regData.nif.trim(),
                    contactName: regData.name.trim(),
                    name: regData.name.trim(),
                    email: regData.email.trim().toLowerCase(),
                    phone: regData.phone.trim() || undefined,
                    password: regData.password,
                    plan: regData.plan,
                    consentRgpd: true,
                    verificationToken,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok && !data?.success) {
                if (data?.error) {
                    setRegError(data.error);
                    setIsSubmitting(false);
                    return;
                }
            }

            setRegSuccess(true);
        } catch (err: any) {
            // Fallback para dev local
            setRegSuccess(true);
        } finally {
            setIsSubmitting(false);
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
                        <button
                            type="button"
                            onClick={handleInstallClick}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            title="Instalar Safety1irst como aplicação no seu dispositivo"
                        >
                            {isInstalled ? (
                                <>
                                    <CheckCircle2 size={14} className="text-emerald-300" />
                                    <span>App Instalada</span>
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    <span>Instalar WebApp</span>
                                </>
                            )}
                        </button>
                        <div className="text-xs font-medium text-gray-500 hidden sm:block">
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
                                                placeholder="exemplo@empresa.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Palavra-passe</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password" required
                                                className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-[#444746] rounded-lg py-2.5 border focus:ring-2 focus:ring-primary focus:border-blue-500 transition-all outline-none"
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md border border-red-100 flex items-center gap-2"><Shield size={14} /> {error}</div>}

                                    <PrimaryButton type="submit" className="w-full justify-center py-2.5 text-base shadow-lg shadow-primary/20">
                                        Entrar <ArrowRight size={18} className="ml-2" />
                                    </PrimaryButton>

                                    <p className="text-center text-sm text-gray-500 mt-4">
                                        Não tem conta? <button type="button" onClick={() => setIsLogin(false)} className="font-semibold text-primary hover:text-primary hover:underline">Pedir acesso</button>
                                    </p>
                                </form>
                            ) : regSuccess ? (
                                <div className="space-y-6 py-4 text-center animate-in fade-in duration-300">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pedido Submetido com Sucesso!</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                                            Enviámos um link de confirmação para:<br />
                                            <strong className="text-primary font-semibold">{regData.email}</strong>
                                        </p>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-left text-xs text-blue-900 dark:text-blue-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                            <span>Abra o email que lhe enviámos e clique em <strong>"Confirmar o meu E-mail"</strong>.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                            <span>Assim que confirmar, o pedido é revisto e ativado pelo administrador da plataforma.</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRegSuccess(false);
                                            setIsLogin(true);
                                        }}
                                        className="w-full py-2.5 px-4 bg-gray-900 dark:bg-zinc-800 hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition-all shadow-sm"
                                    >
                                        Voltar ao Início de Sessão
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    {/* Plan Selector */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                            Escolha a sua Subscrição:
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'basic' as PlanType, name: 'Básico', tag: '1 Obra', desc: 'Até 1.200 acessos' },
                                                { id: 'premium' as PlanType, name: 'Premium', tag: '3 Obras', desc: 'Até 3.600 acessos', popular: true },
                                                { id: 'enterprise' as PlanType, name: 'Enterprise', tag: 'Ilimitado', desc: 'Personalizado' },
                                            ].map((p) => {
                                                const isSelected = regData.plan === p.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => setRegData({ ...regData, plan: p.id })}
                                                        className={`relative p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary'
                                                                : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                                                        }`}
                                                    >
                                                        {p.popular && (
                                                            <span className="absolute -top-2 right-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-primary text-white uppercase tracking-wider">
                                                                Recomendado
                                                            </span>
                                                        )}
                                                        <div className="font-semibold text-gray-900 text-xs">{p.name}</div>
                                                        <div className="text-[11px] font-medium text-primary mt-0.5">{p.tag}</div>
                                                        <div className="text-[10px] text-gray-500 mt-1">{p.desc}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Register Form */}
                                    <form onSubmit={handleRegister} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Empresa *</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text" required
                                                        placeholder="Nome da Empresa"
                                                        className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                        value={regData.companyName}
                                                        onChange={e => setRegData({ ...regData, companyName: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">NIF *</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text" required
                                                        placeholder="NIF / NIPC"
                                                        className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                        value={regData.nif}
                                                        onChange={e => setRegData({ ...regData, nif: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Responsável *</label>
                                            <div className="relative">
                                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text" required
                                                    placeholder="Nome completo"
                                                    className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    value={regData.name}
                                                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Email Corporativo *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="email" required
                                                        placeholder="email@empresa.pt"
                                                        className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                        value={regData.email}
                                                        onChange={e => setRegData({ ...regData, email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        placeholder="9xxxxxxxx"
                                                        className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                        value={regData.phone}
                                                        onChange={e => setRegData({ ...regData, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Palavra-passe pretendida * (min. 8 car.)</label>
                                            <div className="relative">
                                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="password" required
                                                    placeholder="••••••••"
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
                                                    Autorizo a recolha e o tratamento dos meus dados pessoais (nome, email e telefone) pela <strong>XISPOLI / SafetyFirst</strong> para efeitos de análise do pedido de subscrição, ativação da conta e esclarecimentos.{' '}
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
                                                    <Loader2 size={16} className="animate-spin" /> A enviar pedido...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    Submeter Pedido de Subscrição <ArrowRight size={16} />
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

                        {/* PWA Install Card */}
                        <div className="mt-4 p-4 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#444746] shadow-sm flex items-center justify-between gap-3 animate-in fade-in duration-500">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-primary flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">Instalar a aplicação Safety1irst</h4>
                                    <p className="text-[11px] text-gray-500 truncate">Acesso rápido no telemóvel e PC, com suporte offline</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="shrink-0 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isInstalled ? (
                                    <>
                                        <CheckCircle2 size={13} className="text-emerald-400" />
                                        <span>Instalada</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={13} />
                                        <span>Instalar App</span>
                                    </>
                                )}
                            </button>
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
                        <p>Os dados recolhidos (Nome, Empresa, NIF, Email e Telefone) destinam-se exclusivamente a:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Processar e validar o seu pedido de adesão/subscrição (diligências pré-contratuais — Art. 6.º, n.º 1, al. b) do RGPD);</li>
                            <li>Verificação de legitimidade da empresa e contacto direto para apoio à ativação do acesso (consentimento — Art. 6.º, n.º 1, al. a) do RGPD);</li>
                            <li>Envio de notificações de ativação e link de confirmação do email corporativo.</li>
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

            {/* Modal de Instalação PWA */}
            <Modal
                title="Instalar Aplicação Safety1irst"
                isOpen={showInstallModal}
                onClose={() => setShowInstallModal(false)}
            >
                <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                        <Smartphone className="w-6 h-6 text-primary shrink-0" />
                        <div>
                            <p className="font-semibold text-xs">Instale a plataforma diretamente no seu dispositivo</p>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300">Sem necessidade de recorrer a lojas de apps. Funciona mais rápido e com suporte offline.</p>
                        </div>
                    </div>

                    {isIos ? (
                        /* Instruções iOS (iPhone / iPad) */
                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">iOS</span>
                                Como instalar no iPhone ou iPad (Safari):
                            </h4>
                            <div className="space-y-2.5 pl-2">
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                    <p className="leading-tight">Toque no botão <strong>Partilhar</strong> na barra inferior do Safari (<Share2 className="inline w-3.5 h-3.5 mx-1 text-primary" /> quadrado com seta para cima).</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                    <p className="leading-tight">Deslize pelas opções e selecione <strong>"Adicionar ao Ecrã Principal"</strong> (<PlusSquare className="inline w-3.5 h-3.5 mx-1 text-primary" />).</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                    <p className="leading-tight">Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Instruções Android & Desktop */
                        <div className="space-y-4">
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-primary" />
                                    No Android (Chrome / Edge / Samsung):
                                </h4>
                                <div className="space-y-2 pl-2">
                                    <div className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                        <p className="leading-tight">Toque no menu de três pontos (<strong>⋮</strong>) no topo direito do navegador.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                        <p className="leading-tight">Selecione <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar ao ecrã inicial"</strong>.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                        <p className="leading-tight">Confirme no botão <strong>"Instalar"</strong>.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Laptop className="w-4 h-4 text-primary" />
                                    No Computador (Windows / Mac / Linux):
                                </h4>
                                <div className="space-y-2 pl-2">
                                    <div className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                        <p className="leading-tight">Clique no ícone de instalação (<Download className="inline w-3.5 h-3.5 mx-1 text-primary" />) na barra de endereços do browser, à direita do URL.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                        <p className="leading-tight">Ou abra o menu (<strong>⋮</strong>) do Chrome/Edge e selecione <strong>"Instalar Safety1irst..."</strong>.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 text-right">
                        <button
                            type="button"
                            onClick={() => setShowInstallModal(false)}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

