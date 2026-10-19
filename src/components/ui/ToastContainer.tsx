import React from 'react';
import { useStore } from '../../store/useStore';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const { notifications } = useStore();

    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            {notifications.map(notification => (
                <Toast key={notification.id} notification={notification} />
            ))}
        </div>
    );
};

export default ToastContainer;
