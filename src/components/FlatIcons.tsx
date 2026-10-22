import React from 'react';
import { cn } from '@/lib/utils';

export interface FlatIconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    filled?: boolean;
}

/**
 * Google Material Symbols icon font component
 * Reference: https://fonts.google.com/icons
 */
export const GoogleMaterialIcon: React.FC<{
    name: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    filled?: boolean;
}> = ({ name, size = 20, className = '', style, filled = true }) => {
    return (
        <span
            className={cn(
                "material-symbols-rounded inline-flex items-center justify-center leading-none text-center shrink-0 not-italic select-none",
                className
            )}
            style={{
                fontSize: `${size}px`,
                width: `${size}px`,
                height: `${size}px`,
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
                ...style,
            }}
            aria-hidden="true"
        >
            {name}
        </span>
    );
};

/**
 * Factory helper for Google Material Symbols
 */
const createGoogleIcon = (iconName: string, defaultSize = 20) => {
    const Component: React.FC<FlatIconProps> = ({ size = defaultSize, className = '', style, filled = true }) => (
        <GoogleMaterialIcon
            name={iconName}
            size={size}
            className={className}
            style={style}
            filled={filled}
        />
    );
    return Component;
};

// --- Sidebar Navigation Icons (Google Material Symbols) ---
export const FlatDashboardIcon = createGoogleIcon('grid_view', 20);
export const FlatCompaniesIcon = createGoogleIcon('domain', 20);
export const FlatWorkersIcon = createGoogleIcon('groups', 20);
export const FlatEquipmentIcon = createGoogleIcon('front_loader', 20);
export const FlatAccessControlIcon = createGoogleIcon('verified_user', 20);
export const FlatAccidentsIcon = createGoogleIcon('warning', 20);
export const FlatTrainingIcon = createGoogleIcon('school', 20);
export const FlatWorkplanIcon = createGoogleIcon('event_note', 20);
export const FlatFormsIcon = createGoogleIcon('assignment', 20);
export const FlatDocumentsIcon = createGoogleIcon('description', 20);
export const FlatSettingsIcon = createGoogleIcon('settings', 20);

// --- Workplace Hub Icons (Google Material Symbols) ---
export const FlatFolderIcon = createGoogleIcon('folder', 20);
export const FlatCrownIcon = createGoogleIcon('workspace_premium', 20);
export const FlatRequestsIcon = createGoogleIcon('notifications', 20);
export const FlatBriefcaseIcon = createGoogleIcon('business_center', 20);
export const FlatShieldUserIcon = createGoogleIcon('shield_person', 20);

// --- Theme Icons (Google Material Symbols) ---
export const FlatSunIcon = createGoogleIcon('light_mode', 18);
export const FlatMoonIcon = createGoogleIcon('dark_mode', 18);
export const FlatS1Icon = createGoogleIcon('view_sidebar', 18);
