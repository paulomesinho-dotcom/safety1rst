'use client';

import React, { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export const FullScreenToggle = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#131314] rounded-full transition-colors flex items-center justify-center relative"
            title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
        >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
    );
};
