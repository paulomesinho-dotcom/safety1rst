import React from 'react';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists

export const HelpButton = () => {
    return (
        <button
            className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors text-gray-500 hover:bg-gray-100 dark:hover:bg-surface hover:text-gray-900 dark:hover:text-white",
            )}
            title="Help & Tutorials"
            onClick={() => alert("Tutorials coming soon!")}
        >
            <CircleHelp size={20} />
        </button>
    );
};
