import React from 'react';
import { cn } from '@/lib/utils';

export interface FlatIconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Factory helper for Flaticon UIcons (Solid + Straight corner style)
 * Based on: https://www.flaticon.com/uicons (weight=solid, corner=straight)
 */
const createFlaticon = (iconClass: string, defaultSize = 18) => {
    const Component: React.FC<FlatIconProps> = ({ size = defaultSize, className = '', style }) => (
        <i
            className={cn(
                "fi",
                iconClass,
                "inline-flex items-center justify-center leading-none text-center shrink-0 not-italic select-none",
                className
            )}
            style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px`, ...style }}
            aria-hidden="true"
        />
    );
    return Component;
};

// --- Sidebar Navigation Icons (Flaticon UIcons Straight Solid) ---
export const FlatDashboardIcon = createFlaticon('fi-ss-apps', 18);
export const FlatCompaniesIcon = createFlaticon('fi-ss-building', 18);
export const FlatWorkersIcon = createFlaticon('fi-ss-users', 18);
export const FlatEquipmentIcon = createFlaticon('fi-ss-hard-hat', 18);
export const FlatAccessControlIcon = createFlaticon('fi-ss-shield-check', 18);
export const FlatAccidentsIcon = createFlaticon('fi-ss-triangle-warning', 18);
export const FlatTrainingIcon = createFlaticon('fi-ss-graduation-cap', 18);
export const FlatWorkplanIcon = createFlaticon('fi-ss-calendar-clock', 18);
export const FlatFormsIcon = createFlaticon('fi-ss-clipboard-list', 18);
export const FlatDocumentsIcon = createFlaticon('fi-ss-document', 18);
export const FlatSettingsIcon = createFlaticon('fi-ss-settings', 18);

// --- Workplace Hub Icons (Flaticon UIcons Straight Solid) ---
export const FlatFolderIcon = createFlaticon('fi-ss-folder', 18);
export const FlatCrownIcon = createFlaticon('fi-ss-crown', 18);
export const FlatRequestsIcon = createFlaticon('fi-ss-bell', 18);
export const FlatBriefcaseIcon = createFlaticon('fi-ss-briefcase', 18);
export const FlatShieldUserIcon = createFlaticon('fi-ss-user-lock', 18);

// --- Theme Icons (Flaticon UIcons Straight Solid) ---
export const FlatSunIcon = createFlaticon('fi-ss-sun', 16);
export const FlatMoonIcon = createFlaticon('fi-ss-moon', 16);
export const FlatS1Icon = createFlaticon('fi-ss-sidebar', 16);
