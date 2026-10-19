import React, { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
    error?: string;
    children: React.ReactNode;
    optional?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({
    label,
    error,
    children,
    className,
    optional,
    ...props
}) => {
    return (
        <div className={cn("space-y-1.5", className)} {...props}>
            {label && (
                <label className="block text-sm font-normal text-gray-700 dark:text-gray-200 flex justify-between">
                    <span>{label}</span>
                    {optional && <span className="text-xs text-gray-400 font-normal italic">Optional</span>}
                </label>
            )}
            <div className="relative">
                {children}
            </div>
            {error && (
                <p className="text-xs text-red-500 animate-in slide-in-from-top-1">{error}</p>
            )}
        </div>
    );
};
