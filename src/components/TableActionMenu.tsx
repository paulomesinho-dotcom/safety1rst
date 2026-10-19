
import React from 'react';
import { MoreVertical } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { cn } from '../lib/utils';

interface TableActionMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const TableActionMenu: React.FC<TableActionMenuProps> = ({
    isOpen,
    onToggle,
    onClose,
    children,
    className
}) => {
    const ref = useClickOutside<HTMLDivElement>(() => {
        if (isOpen) onClose();
    });

    return (
        <div ref={ref} className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    isOpen ? "bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface"
                )}
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && (
                <div
                    className="absolute right-8 top-0 z-[100] bg-white dark:bg-surface shadow-xl border border-gray-100 dark:border-[#444746] rounded-xl w-48 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            )}
        </div>
    );
};
