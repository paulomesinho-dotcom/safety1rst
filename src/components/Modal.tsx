'use client';

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';

interface ModalProps {
    title: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string; // Tailwind class
    resizable?: boolean;
    fullScreen?: boolean;
    /** Slot for action buttons rendered in the header (right side, before the close button) */
    headerAction?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children, maxWidth = "max-w-2xl", resizable = false, fullScreen = false, headerAction }) => {
    const ref = useClickOutside<HTMLDivElement>(() => {
        onClose();
    });

    if (!isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200",
            !fullScreen && "p-4"
        )}>
            <div
                ref={ref}
                className={cn(
                    "bg-white dark:bg-surface rounded-xl shadow-2xl flex flex-col relative w-full transition-all duration-300",
                    "max-h-[90vh]",
                    maxWidth,
                    fullScreen && "fixed inset-0 w-screen h-screen max-h-screen max-w-none rounded-none m-0 z-[9010]"
                )}
            >
                {/* ── Modal Header ── */}
                <div className="px-5 py-3 border-b border-gray-100 dark:border-[#444746] flex-shrink-0 flex items-center justify-between gap-4 bg-gray-50/60 dark:bg-[#1a1a1a]/60 rounded-t-xl">
                    {/* Title */}
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate min-w-0">{title}</h2>

                    {/* Actions + Close */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {headerAction && (
                            <>
                                <div className="w-px h-5 bg-gray-200 dark:bg-[#444746]" />
                                {headerAction}
                                <div className="w-px h-5 bg-gray-200 dark:bg-[#444746]" />
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            title="Fechar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const InputGroup: React.FC<{ label: string; action?: React.ReactNode; children: React.ReactNode }> = ({ label, action, children }) => (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
            {action}
        </div>
        {children}
    </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
    <button
        className={cn(
            "w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2",
            className
        )}
        {...props}
    />
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
    <button
        className={cn(
            "w-full bg-white dark:bg-surface text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[#444746] font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#131314] active:scale-[0.98] transition-all",
            className
        )}
        {...props}
    />
);
