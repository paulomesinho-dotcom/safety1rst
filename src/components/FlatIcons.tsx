import React from 'react';

export interface FlatIconProps {
    size?: number;
    className?: string;
}

/**
 * Dashboard Flat Icon — 4 clean rounded tiles
 */
export const FlatDashboardIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fillOpacity="0.75" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fillOpacity="0.75" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
);

/**
 * Companies / Organizações Flat Icon — Simple corporate building duo
 */
export const FlatCompaniesIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16H4zm11-10h4a2 2 0 0 1 2 2v8h-6V11z" />
        <rect x="7" y="6" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="10" y="6" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="7" y="10" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="10" y="10" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="7" y="14" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
        <rect x="10" y="14" width="2" height="2" rx="0.5" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Workers / Pessoas Flat Icon — Clean team silhouettes
 */
export const FlatWorkersIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="7" r="3.5" />
        <path d="M2 19c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1H2v-1z" />
        <circle cx="17.5" cy="8" r="2.5" fillOpacity="0.75" />
        <path d="M15 15c1.2-.5 2.5-.7 3.8-.5 2 .3 3.2 1.6 3.2 3.5V19h-5.2c.2-.8.2-1.7-.1-2.5-.3-.6-.9-1.2-1.7-1.5z" fillOpacity="0.75" />
    </svg>
);

/**
 * Equipment / HardHat Flat Icon — Simple industrial helmet
 */
export const FlatEquipmentIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4a8 8 0 0 0-8 8v2h16v-2a8 8 0 0 0-8-8z" />
        <path d="M2 17a1.5 1.5 0 0 0 1.5 1.5h17A1.5 1.5 0 0 0 22 17v-1H2v1z" />
    </svg>
);

/**
 * Access Control Flat Icon — Simple security shield with verified tick
 */
export const FlatAccessControlIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5.5v6c0 5.5 3.4 10.5 8 12 4.6-1.5 8-6.5 8-12v-6L12 2z" />
        <path d="M10.5 14.5l-2.5-2.5 1.4-1.4 1.1 1.1 4.1-4.1 1.4 1.4-5.5 5.5z" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Accidents / Safety & Risks Flat Icon — Warning triangle
 */
export const FlatAccidentsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10.3 3.5c.7-1.3 2.7-1.3 3.4 0l8.9 15.5c.7 1.3-.2 2.8-1.7 2.8H3.1c-1.5 0-2.4-1.6-1.7-2.8L10.3 3.5z" />
        <rect x="11" y="8.5" width="2" height="5.5" rx="1" fill="var(--bg-card, #fff)" />
        <circle cx="12" cy="17" r="1.2" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Training / Formação Flat Icon — Graduation cap
 */
export const FlatTrainingIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L1 8.5 12 14l9-4.5V16h2V8.5L12 3z" />
        <path d="M5 12.5V16c0 3 3.1 5.5 7 5.5s7-2.5 7-5.5v-3.5l-7 3.5-7-3.5z" fillOpacity="0.75" />
    </svg>
);

/**
 * Workplan / Plano de Trabalhos Flat Icon — Clipboard
 */
export const FlatWorkplanIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19 4h-3.2c-.4-1.2-1.5-2-2.8-2s-2.4.8-2.8 2H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-6-1c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" />
        <path d="M9 11l1.5 1.5 3.5-3.5 1.2 1.2-4.7 4.7-2.7-2.7 1.2-1.2z" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Forms / Formulários Flat Icon — Form sheet
 */
export const FlatFormsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="3" width="16" height="18" rx="2.5" />
        <rect x="7" y="7" width="10" height="2" rx="1" fill="var(--bg-card, #fff)" />
        <rect x="7" y="11" width="10" height="2" rx="1" fill="var(--bg-card, #fff)" />
        <rect x="7" y="15" width="6" height="2" rx="1" fill="var(--bg-card, #fff)" />
    </svg>
);

/**
 * Documents / Documentos Flat Icon — File with preview
 */
export const FlatDocumentsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 15H8v-2h8v2zm0-4H8v-2h8v2z" />
    </svg>
);

/**
 * Settings / Configurações Flat Icon — Mechanical gear
 */
export const FlatSettingsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 8.48a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.6.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
);

/**
 * All Projects / Folder Flat Icon
 */
export const FlatFolderIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
);

/**
 * Crown / Subscriptions Flat Icon
 */
export const FlatCrownIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2 18h20v2H2v-2zm0-2l3-10 4.5 6L14 3l4.5 9 3-6 2.5 10H2z" />
    </svg>
);

/**
 * Requests / FileCheck Flat Icon
 */
export const FlatRequestsIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-3.5 16l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z" />
    </svg>
);

/**
 * Briefcase Flat Icon
 */
export const FlatBriefcaseIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-10-2h4v2h-4V4z" />
    </svg>
);

/**
 * Shield User / GDPR Flat Icon
 */
export const FlatShieldUserIcon: React.FC<FlatIconProps> = ({ size = 18, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5 12.8c-1.4 1.2-3.1 2-5 2.2-1.9-.2-3.6-1-5-2.2v-.8c0-1.7 2.2-3 5-3s5 1.3 5 3v.8z" />
    </svg>
);

/**
 * Sun Flat Icon
 */
export const FlatSunIcon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

/**
 * Moon Flat Icon
 */
export const FlatMoonIcon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

/**
 * S1 Flat Icon: Visualizes Petroleum Blue Sidebar + Light Content
 */
export const FlatS1Icon: React.FC<FlatIconProps> = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
        {/* Petroleum Blue Left Sidebar */}
        <path d="M2 6a3 3 0 0 1 3-3h5v18H5a3 3 0 0 1-3-3V6z" fill="#084d6e" />
        {/* Simple Content Lines */}
        <rect x="13" y="7" width="6" height="2" rx="1" fill="currentColor" fillOpacity="0.5" />
        <rect x="13" y="11" width="4" height="2" rx="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
);
