import React from 'react';
import { HelpButton } from './HelpButton';
import { FullScreenToggle } from './FullScreenToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeMenu } from './ThemeMenu';
import { useStore } from '@/store/useStore';
import { useParams } from 'next/navigation';
import { Building2 } from 'lucide-react';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, icon }) => {
    const params = useParams();
    const projectId = params?.id as string;
    const { projects } = useStore();
    const currentProject = projects.find(p => p.id === projectId);

    const displayTitle = title || currentProject?.name;
    const displaySubtitle = subtitle || currentProject?.address;

    return (
        <header className="h-16 px-6 flex items-center justify-between bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-30 transition-colors">
            {/* Left: Project or Custom Context */}
            <div className="flex items-center gap-3 min-w-0">
                {displayTitle ? (
                    <>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[var(--primary)] flex items-center justify-center shrink-0 border border-blue-500/20">
                            {icon || <Building2 size={18} />}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-[var(--text)] tracking-tight truncate">
                                {displayTitle}
                            </h2>
                            {displaySubtitle && (
                                <p className="text-xs text-[var(--text-muted)] truncate">
                                    {displaySubtitle}
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-sm font-medium text-[var(--text-muted)]">
                        Safety1irst
                    </div>
                )}
            </div>

            {/* Right: Actions (Theme, Language, Fullscreen, Help) */}
            <div className="flex items-center gap-2.5">
                <ThemeMenu />
                <LanguageSwitcher />
                <div className="h-5 w-px bg-[var(--border)] mx-0.5" />
                <FullScreenToggle />
                <HelpButton />
            </div>
        </header>
    );
};

export default Header;
