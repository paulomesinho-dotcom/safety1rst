import React, { useRef, useState, useEffect } from 'react';
import { Settings, Sliders, Server, Globe, Moon, Sun, Laptop, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter, usePathname } from '@/navigation'; // Ensure this path is correct for next-intl
import { useLocale } from 'next-intl';
import ProjectSettingsModal from './ProjectSettingsModal';
import { CDESettingsModal } from './CDESettingsModal';
import { useStore } from '@/store/useStore';
import { useParams } from 'next/navigation';

export const SettingsMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [isCDEOpen, setIsCDEOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme, color, setColor, iconTheme, setIconTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const params = useParams();
    const projectId = params?.id as string;

    const { projects } = useStore();
    const project = projects.find(p => p.id === projectId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 400); // 400ms delay before closing
    };

    return (
        <div
            className="relative"
            ref={menuRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors text-gray-500 hover:bg-gray-100 dark:hover:bg-surface hover:text-gray-900 dark:hover:text-white",
                    isOpen && "bg-gray-100 dark:bg-surface text-gray-900 dark:text-white"
                )}
                title="Settings"
            >
                <Settings size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-surface rounded-xl shadow-lg border border-gray-100 dark:border-[#444746] py-2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Application
                    </div>

                    {/* Language */}
                    <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <Globe size={16} className="text-gray-400" />
                            <span>Language</span>
                        </div>
                        <select
                            value={locale}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="bg-gray-50 dark:bg-[#131314] border-none text-gray-700 dark:text-gray-200 text-xs rounded-md focus:ring-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface py-1 pl-2 pr-6"
                        >
                            <option value="en">English</option>
                            <option value="pt">Português</option>
                        </select>
                    </div>

                    {/* Theme */}
                    <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <Moon size={16} className="text-gray-400" />
                            <span>Appearance</span>
                        </div>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value as any)}
                            className="bg-gray-50 dark:bg-[#131314] border-none text-gray-700 dark:text-gray-200 text-xs rounded-md focus:ring-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface py-1 pl-2 pr-6"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    {/* Color Theme */}
                    <div className="px-4 py-2 flex items-center justify-between pb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-surface" />
                            </div>
                            <span>Temas</span>
                        </div>
                        <select
                            value={color}
                            onChange={(e) => setColor(e.target.value as any)}
                            className="bg-gray-50 dark:bg-[#131314] border-none text-gray-700 dark:text-gray-200 text-xs rounded-md focus:ring-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface py-1 pl-2 pr-6 max-w-[130px] truncate"
                            aria-label="Select Color Theme"
                        >
                            <option value="safety">Safety1irst</option>
                            <option value="green">Green</option>
                            <option value="pink">Pink</option>
                            <option value="blue">Blue</option>
                            <option value="brown">Brown</option>
                            <option value="colab">Colab</option>
                            <option value="bim">BIM</option>
                            <option value="xispoli">Xispoli (Official)</option>
                            <option value="x1">X1</option>
                            <option disabled>--- Deep Themes ---</option>
                            <option value="deep/green">Deep Green</option>
                            <option value="deep/blue">Deep Blue</option>
                            <option value="deep/pink">Deep Pink</option>
                            <option value="deep/brown">Deep Brown</option>
                            <option value="deep/bim">Deep BIM</option>
                            <option value="deep/xispoli">Deep Xispoli</option>
                        </select>
                    </div>

                    {/* Icon Theme */}
                    <div className="px-4 py-2 flex items-center justify-between pb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <Shield size={16} className="text-gray-400" />
                            <span>Icons</span>
                        </div>
                        <select
                            value={iconTheme || 'safety'}
                            onChange={(e) => setIconTheme(e.target.value as any)}
                            className="bg-gray-50 dark:bg-[#131314] border-none text-gray-700 dark:text-gray-200 text-xs rounded-md focus:ring-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface py-1 pl-2 pr-6 max-w-[130px] truncate"
                            aria-label="Select Icon Theme"
                        >
                            <option value="safety">Safety1irst</option>
                            <option value="round">Round</option>
                            <option value="colour">Colour</option>
                            <option value="future">Future</option>
                            <option value="bim">BIM</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
