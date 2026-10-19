import React from 'react';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';
import { AlertTriangle, Trash2, Archive, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: 'trash' | 'archive' | 'alert';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    icon = 'alert'
}) => {
    const getIcon = () => {
        switch (icon) {
            case 'trash': return <Trash2 size={24} />;
            case 'archive': return <Archive size={24} />;
            case 'alert': default: return <AlertTriangle size={24} />;
        }
    };

    const getColors = () => {
        switch (variant) {
            case 'danger': return 'bg-red-50 text-red-600';
            case 'warning': return 'bg-orange-50 text-orange-600';
            case 'info': return 'bg-blue-50 text-brand';
        }
    };

    const getButtonColor = () => {
        switch (variant) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-orange-600 hover:bg-orange-700';
            case 'info': return 'bg-brand hover:bg-blue-700';
        }
    };

    return (
        <Modal title={title} isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${getColors()}`}>
                    {getIcon()}
                    <p className="font-medium">{message}</p>
                </div>
                {description && (
                    <p className="text-sm text-gray-500">{description}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <SecondaryButton onClick={onClose}>{cancelText}</SecondaryButton>
                    <PrimaryButton
                        className={getButtonColor()}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
};
