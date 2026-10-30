import React, { useRef, useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const UserMenu = () => {
    const currentUser = useStore((state) => state.currentUser);
    const logout = useStore((state) => state.logout);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

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

    if (!currentUser) return null;

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        router.push('/login');




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
                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer ring-4 ring-transparent hover:ring-black/5 transition-all text-center leading-none"
                title="Account"
            >
                {currentUser.name.charAt(0).toUpperCase()}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface rounded-3xl shadow-2xl border border-gray-100 dark:border-[#444746] overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 flex flex-col items-center gap-2">
                        <div className="text-gray-500 text-sm mb-2">{currentUser.email}</div>

                        <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-medium mb-2">
                            {currentUser.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="text-xl text-gray-800 dark:text-gray-100 font-medium">Hi, {currentUser.name}!</div>

                        <button className="mt-4 px-6 py-2 rounded-full border border-gray-300 dark:border-[#444746] text-primary font-medium hover:bg-primary-light transition-colors text-sm">
                            Manage your Account
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#131314] p-4 border-t border-gray-100 dark:border-[#444746] flex justify-center">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] shadow-sm text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-surface transition-colors text-sm"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#131314] text-[10px] text-gray-400 text-center pb-2">
                        Privacy • Terms
                    </div>
                </div>
            )}
        </div>
    );
};
