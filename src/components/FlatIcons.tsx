import React from 'react';

export interface FlatIconProps {
    size?: number;
    className?: string;
}

/**
 * Dashboard Flat Filled Icon
 * Modern 4-tile executive analytics dashboard layout
 */
export const FlatDashboardIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="10" rx="2" />
        <rect x="13" y="3" width="8" height="6" rx="2" fillOpacity="0.8" />
        <rect x="13" y="11" width="8" height="10" rx="2" />
        <rect x="3" y="15" width="8" height="6" rx="2" fillOpacity="0.8" />
    </svg>
);

/**
 * Companies / Organizações Flat Filled Icon
 * Solid corporate building silhouette with stylized window matrix
 */
export const FlatCompaniesIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 21h18v-2H3v2z" />
        <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16H5z" />
        <path d="M15 9h4a2 2 0 0 1 2 2v10h-6V9z" fillOpacity="0.75" />
        {/* Cutouts for Windows */}
        <circle cx="8" cy="7" r="1" fill="var(--bg-card, #fff)" />
        <circle cx="12" cy="7" r="1" fill="var(--bg-card, #fff)" />
        <circle cx="8" cy="11" r="1" fill="var(--bg-card, #fff)" />
        <circle cx="12" cy="11" r="1" fill="var(--bg-card, #fff)" />
        <circle cx="8" cy="15" r="1" fill="var(--bg-card, #fff)" />
        <circle cx="12" cy="15" r="1" fill="var(--bg-card, #fff)" />
        <rect x="9.5" y="18" width="3" height="3" fill="var(--bg-card, #fff)" rx="0.5" />
    </svg>
);

/**
 * Workers / Pessoas Flat Filled Icon
 * Solid team silhouettes with clean head circles and rounded shoulders
 */
export const FlatWorkersIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        {/* Secondary Person */}
        <circle cx="16.5" cy="7.5" r="3" fillOpacity="0.7" />
        <path d="M14 13.5c1.2-.4 2.6-.6 4-.4 2.5.3 4 1.8 4 3.9V19h-7.5c.3-.9.4-1.9.3-3-.1-.9-.4-1.7-.8-2.5z" fillOpacity="0.7" />
        {/* Primary Foreground Person */}
        <circle cx="9" cy="7" r="3.5" />
        <path d="M2 19v-1.8c0-2.6 2.3-4.7 5.2-5.1 1.2-.2 2.4-.2 3.6 0 2.9.4 5.2 2.5 5.2 5.1V19H2z" />
    </svg>
);

/**
 * Equipment / HardHat Flat Filled Icon
 * Industrial hardhat with curved shell and solid safety ridge
 */
export const FlatEquipmentIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2 17a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1z" />
        <path d="M4 14.5c0-4.4 3.6-8 8-8s8 3.6 8 8c0 .5-.4 1-.9 1H4.9c-.5 0-.9-.5-.9-1z" />
        {/* Central Ridge Bar */}
        <path d="M10.5 4h3a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fillOpacity="0.85" />
    </svg>
);

/**
 * Access Control Flat Filled Icon
 * Solid security shield with biometric badge / lock center
 */
export const FlatAccessControlIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5.5v6.2c0 5.4 3.4 10.4 8 11.8 4.6-1.4 8-6.4 8-11.8V5.5L12 2z" />
        {/* Stylized Badge Scanner Checkmark Cutout */}
        <path d="M10.5 15.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6z" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Accidents / Safety & Risks Flat Filled Icon
 * Bold triangular warning badge with exclamation cutout
 */
export const FlatAccidentsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10.3 3.2c.7-1.3 2.7-1.3 3.4 0l8.9 15.5c.7 1.3-.2 2.8-1.7 2.8H3.1c-1.5 0-2.4-1.6-1.7-2.8L10.3 3.2z" />
        {/* Cutout Exclamation */}
        <rect x="11" y="8" width="2" height="6" rx="1" fill="var(--bg-card, #fff)" />
        <circle cx="12" cy="17" r="1.25" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Training / Formação Flat Filled Icon
 * Solid mortarboard graduation cap and scroll ribbon
 */
export const FlatTrainingIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L1 8.5 12 14l9-4.5V16h2V8.5L12 3z" />
        <path d="M5 12.2V16c0 3 3.1 5.5 7 5.5s7-2.5 7-5.5v-3.8l-7 3.5-7-3.5z" fillOpacity="0.8" />
    </svg>
);

/**
 * Workplan / Plano de Trabalhos Flat Filled Icon
 * Solid clipboard with completed task checkmarks
 */
export const FlatWorkplanIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19 4h-3.2c-.4-1.2-1.5-2-2.8-2s-2.4.8-2.8 2H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-6-1c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" />
        {/* Checklist rows cutout */}
        <rect x="8" y="9" width="3" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="12" y="9" width="6" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="8" y="13" width="3" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="12" y="13" width="6" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="8" y="17" width="3" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="12" y="17" width="4" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Forms / Formulários Flat Filled Icon
 * Solid form sheet with input check markers
 */
export const FlatFormsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="var(--bg-card, #fff)" />
        <rect x="11" y="6.5" width="7" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <circle cx="7.5" cy="12" r="1.5" fill="var(--bg-card, #fff)" />
        <rect x="11" y="11" width="7" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <circle cx="7.5" cy="16.5" r="1.5" fill="var(--bg-card, #fff)" />
        <rect x="11" y="15.5" width="7" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Documents / Documentos Flat Filled Icon
 * Solid document with folded corner and preview stripes
 */
export const FlatDocumentsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5l-6-6z" fill="var(--bg-card, #fff)" fillOpacity="0.4" />
        {/* Content rows cutout */}
        <rect x="8" y="11" width="8" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="8" y="14.5" width="8" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="8" y="18" width="5" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Settings / Configurações Flat Filled Icon
 * Solid mechanical gear with precision teeth and center hub
 */
export const FlatSettingsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 8.48a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.6.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
);

/**
 * All Projects / Folder Flat Filled Icon
 */
export const FlatFolderIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
);

/**
 * Crown / Subscriptions Flat Filled Icon
 */
export const FlatCrownIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 19h19a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-19a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z" />
        <path d="M2 17l2.5-11 5 6 4.5-9 4.5 9 5-6 2.5 11H2z" />
        <circle cx="2" cy="6" r="1.5" />
        <circle cx="12" cy="3" r="1.5" />
        <circle cx="22" cy="6" r="1.5" />
    </svg>
);

/**
 * Requests / FileCheck Flat Filled Icon
 */
export const FlatRequestsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-3.5 16l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z" />
    </svg>
);

/**
 * Briefcase Flat Filled Icon
 */
export const FlatBriefcaseIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-10-2h4v2h-4V4z" />
    </svg>
);

/**
 * Shield User / GDPR Flat Filled Icon
 */
export const FlatShieldUserIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5 12.8c-1.4 1.2-3.1 2-5 2.2-1.9-.2-3.6-1-5-2.2v-.8c0-1.7 2.2-3 5-3s5 1.3 5 3v.8z" />
    </svg>
);

/**
 * Sun Flat Filled Icon
 */
export const FlatSunIcon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

/**
 * Moon Flat Filled Icon
 */
export const FlatMoonIcon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

/**
 * S1 Flat Icon: Visualizes Dark Sidebar + Light Content
 */
export const FlatS1Icon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
        {/* Dark Left Sidebar */}
        <path d="M2 6a3 3 0 0 1 3-3h4v18H5a3 3 0 0 1-3-3V6z" fill="currentColor" />
        {/* Mini Accent Dot on Workspace */}
        <circle cx="15.5" cy="9.5" r="2" fill="currentColor" fillOpacity="0.4" />
        <rect x="13.5" y="13.5" width="5.5" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.3" />
    </svg>
);
