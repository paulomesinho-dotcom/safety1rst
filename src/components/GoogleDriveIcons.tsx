import React from 'react';

type IconType = 'folder' | 'pdf' | 'word' | 'excel' | 'image' | 'video' | 'zip' | 'default';

interface GoogleDriveIconProps {
    type: IconType | string;
    size?: number;
    className?: string;
    customColor?: string;
}

export const GoogleDriveIcon: React.FC<GoogleDriveIconProps> = ({ type, size = 24, className, customColor }) => {
    // Map generic types to specific icons
    const getIconType = (t: string): IconType => {
        const lower = t.toLowerCase();
        if (lower.includes('pdf')) return 'pdf';
        if (lower.includes('word') || lower.includes('doc')) return 'word';
        if (lower.includes('excel') || lower.includes('sheet') || lower.includes('xls') || lower.includes('csv')) return 'excel';
        if (lower.includes('image') || lower.includes('jpg') || lower.includes('png') || lower.includes('jpeg')) return 'image';
        if (lower.includes('video') || lower.includes('mp4') || lower.includes('mov')) return 'video';
        if (lower.includes('zip') || lower.includes('rar') || lower.includes('compressed')) return 'zip';
        if (lower === 'folder' || lower.includes('vnd.google-apps.folder')) return 'folder';
        return 'default';
    };

    const iconType = getIconType(type);
    const effectiveSize = iconType === 'folder' ? Math.round(size * 1.15) : size;

    const icons = {
        folder: (
            <svg width={effectiveSize} height={effectiveSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill={customColor || "#5F6368"} opacity={customColor ? "1" : "0.9"} />
            </svg>
        ),
        pdf: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#EA4335" />
                <path d="M16 11.4H13.6V16H15.2V14.4H16C16.4 14.4 16.8 14 16.8 13.6V12.2C16.8 11.7 16.4 11.4 16 11.4ZM16 13.6H15.2V12.2H16V13.6ZM9.2 16H10.8V13.84H12V13H10.8V12.2H12.4V11.4H9.2V16ZM7.6 11.4V16H9.2C9.6 16 10 15.6 10 15.2V12.2C10 11.7 9.6 11.4 9.2 11.4H7.6ZM9.2 15.2H8.4V12.2H9.2V15.2Z" fill="#EA4335" />
            </svg>
        ),
        word: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#4285F4" />
                <path d="M15.2 16.4L13.8 13.2L12.4 16.4H10.8L9.4 13.2L8 16.4H6.4L8.8 11.4H10L11.6 15L13.2 11.4H14.4L16.8 16.4H15.2Z" fill="#4285F4" />
            </svg>
        ),
        excel: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#34A853" />
                <path d="M9.8 17.6H9.4L12.2 13.6L9.6 9.8H11.2L12.8 12.4L14.6 9.8H16.2L13.6 13.6L16.6 17.6H15L13 14.8L11.2 17.6H9.8Z" fill="#34A853" />
            </svg>
        ),
        image: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#EA4335" />
                <path d="M8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#EA4335" />
            </svg>
        ),
        video: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#EA4335" />
                <path d="M10 16L15 13L10 10V16Z" fill="#EA4335" />
            </svg>
        ),
        zip: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#FBBC04" />
                <path d="M16 16H8V14.4H16V16ZM16 12.8H8V11.2H16V12.8ZM14 9.6H8V8H14V9.6Z" fill="#FBBC04" />
            </svg>
        ),
        default: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#5F6368" />
            </svg>
        )
    };

    return icons[iconType] || icons.default;
};
