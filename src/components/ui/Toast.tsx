import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Notification } from '../../types';

interface ToastProps {
    notification: Notification;
}

const Toast: React.FC<ToastProps> = ({ notification }) => {
    const removeNotification = useStore((state: any) => state.removeNotification);

    useEffect(() => {
        const timer = setTimeout(() => {
            removeNotification(notification.id);
        }, 5000); // Auto dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [notification.id, removeNotification]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-primary" />,
        warning: <AlertTriangle className="w-5 h-5 text-orange-500" />
    };

    const bgColors = {
        success: 'bg-white dark:bg-surface border-green-100',
        error: 'bg-white dark:bg-surface border-red-100',
        info: 'bg-white dark:bg-surface border-primary/10',
        warning: 'bg-white dark:bg-surface border-orange-100'
    };

    return (
        <div className={cn(
            "flex items-start gap-3 p-4 rounded-lg shadow-lg border w-80 animate-in slide-in-from-right-full duration-300 pointer-events-auto",
            bgColors[notification.type]
        )}>
            <div className="shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium leading-tight">{notification.message}</p>
            </div>
            <button
                onClick={() => removeNotification(notification.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
