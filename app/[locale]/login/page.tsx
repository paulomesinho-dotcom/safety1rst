'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Shield, Mail, Lock, Building2, ArrowRight, Box, Smartphone, CheckCircle, FileText, HardHat, Truck } from 'lucide-react';
import { PrimaryButton } from '@/components/Modal';
import { BrandLogo } from '@/components/BrandLogo';

export default function LoginPage() {
    const router = useRouter();
    const { users, setCurrentUser, login } = useStore();
    const [isLogin, setIsLogin] = useState(true);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Register State
    const [regType, setRegType] = useState<'invite' | 'request'>('invite');
    const [regData, setRegData] = useState({ name: '', email: '', password: '', projectCode: '', companyName: '' });

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

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        alert(regType === 'invite'
            ? "Account created! Please waiting for an admin to approve your Access to the project."
            : "Request sent! Our team will verify your company and contact you.");
        setIsLogin(true);
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo removed from header as requested */}
                    </div>
                    <div className="text-sm font-medium text-gray-500 hidden sm:block">
                        Safety Management Platform v2.0
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
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-lg mb-4">
                                        <button onClick={() => setRegType('invite')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${regType === 'invite' ? 'bg-white dark:bg-surface shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>Join Project</button>
                                        <button onClick={() => setRegType('request')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${regType === 'request' ? 'bg-white dark:bg-surface shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>New Company</button>
                                    </div>

                                    <form onSubmit={handleRegister} className="space-y-3">
                                        <input type="text" required placeholder="Full Name" className="w-full px-3 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                                        <input type="email" required placeholder="Email" className="w-full px-3 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} />
                                        <input type="password" required placeholder="Password" className="w-full px-3 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} />

                                        {regType === 'request' && (
                                            <input type="text" required placeholder="Company Name" className="w-full px-3 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                value={regData.companyName} onChange={e => setRegData({ ...regData, companyName: e.target.value })} />
                                        )}

                                        <PrimaryButton type="submit" className="w-full justify-center py-2.5 text-base mt-2">
                                            {regType === 'invite' ? 'Request Access' : 'Submit Application'}
                                        </PrimaryButton>
                                    </form>
                                    <p className="text-center text-sm text-gray-500">
                                        <button type="button" onClick={() => setIsLogin(true)} className="font-semibold text-primary hover:text-primary">Back to Sign In</button>
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
        </div>
    );
}
