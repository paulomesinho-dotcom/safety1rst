import React from 'react';
import { cn } from '@/lib/utils';

export const BrandLogo = ({ className = "text-2xl", isBim = false, isColab = false }: { className?: string, isBim?: boolean, isColab?: boolean }) => {
    return (
        <div className="flex flex-col">
            <span className={`${className} font-outfit font-medium tracking-tight leading-none`}>
                <span className={isBim || isColab ? "text-white" : "text-blue-950 dark:text-white"}>Safety</span>
                <span className={isBim ? "text-[#39CACC]" : "text-primary dark:text-[#8ab4f8]"}>1irst</span>
            </span>
            <span className={cn(
                "text-[9px] font-medium uppercase tracking-[0.2em] mt-0.5 ml-0.5 whitespace-nowrap",
                isColab ? "text-white" : "text-gray-500 dark:text-gray-400"
            )}>
                BIM Management System
            </span>
        </div>
    );
};
