import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export const PrimaryButton: React.FC<ButtonProps> = ({
    children,
    className,
    isLoading,
    variant = 'primary',
    size = 'md',
    disabled,
    ...props
}) => {
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-sm border-transparent",
        secondary: "bg-white dark:bg-surface text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] border-gray-200 dark:border-[#444746] shadow-sm",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm border-transparent",
        ghost: "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface border-transparent",
        outline: "bg-transparent border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314]",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none border",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};
