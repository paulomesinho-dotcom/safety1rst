import { isoIconsList, isoSvgStrings } from './isoIcons';
import { leomarcIconsList, leomarcSvgStrings } from './leomarcIcons';
import { solidPaths } from './solidIcons';

export interface SafetySymbolMeta {
    id: string;
    name: string;
    cat: string;
    source: 'iso7010' | 'leomarc' | 'solid';
}

const isoDict = isoSvgStrings as Record<string, string>;
const leoDict = leomarcSvgStrings as Record<string, string>;
const solidDict = solidPaths as Record<string, string>;

export const ALL_SAFETY_SYMBOLS: SafetySymbolMeta[] = [
    ...isoIconsList.map(item => ({ ...item, source: 'iso7010' as const })),
    ...leomarcIconsList.map(item => ({ ...item, source: 'leomarc' as const })),
    ...Object.keys(solidPaths).map(id => ({ id, name: id.toUpperCase(), cat: 'equipment', source: 'solid' as const }))
];

export function getSymbolSvg(id: string): string | null {
    if (isoDict[id]) return isoDict[id];
    if (leoDict[id]) return leoDict[id];
    return null;
}

export function getSolidPath(id: string): string | null {
    return solidDict[id] || null;
}