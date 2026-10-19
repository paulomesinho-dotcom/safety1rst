import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'app', 'globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

const injection = `
    /* Technological Elements for the Data Columns / Main Content Area in BIM Theme */
    html:not(.dark)[data-color="bim"] main,
    html:not(.dark)[data-color="bim"] .bg-white {
        background-color: rgba(15, 23, 42, 0.6) !important;
        background-image: 
            linear-gradient(rgba(57, 202, 204, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(57, 202, 204, 0.05) 1px, transparent 1px),
            linear-gradient(180deg, transparent 0%, rgba(57, 202, 204, 0.02) 50%, transparent 100%) !important;
        background-size: 15px 15px, 15px 15px, 100% 200% !important;
        border-color: rgba(57, 202, 204, 0.2) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        color: #e2e8f0 !important;
        box-shadow: inset 0 0 20px rgba(57, 202, 204, 0.05) !important;
    }

    /* Target Tables and inner elements specifically for BIM Theme */
    html:not(.dark)[data-color="bim"] table th,
    html:not(.dark)[data-color="bim"] .bg-gray-50,
    html:not(.dark)[data-color="bim"] thead {
        background-color: rgba(10, 15, 30, 0.8) !important;
        border-bottom-color: rgba(57, 202, 204, 0.3) !important;
        color: #39CACC !important;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-size: 0.75rem;
        box-shadow: 0 4px 10px -2px rgba(57, 202, 204, 0.1) !important;
    }

    html:not(.dark)[data-color="bim"] tr,
    html:not(.dark)[data-color="bim"] td {
        border-color: rgba(57, 202, 204, 0.1) !important;
        background-color: transparent !important;
    }

    html:not(.dark)[data-color="bim"] .text-gray-900,
    html:not(.dark)[data-color="bim"] .text-slate-900 {
        color: #f8fafc !important;
    }
    
    html:not(.dark)[data-color="bim"] .text-gray-500,
    html:not(.dark)[data-color="bim"] .text-gray-600,
    html:not(.dark)[data-color="bim"] .text-slate-500 {
        color: #94a3b8 !important;
    }
`;

if (!css.includes('Technological Elements for the Data Columns')) {
    css = css.replace(/(\s+html,\s+body\s+\{\s+@apply)/, injection + '\n$1');
    fs.writeFileSync(cssPath, css);
    console.log('Successfully injected BIM tech CSS.');
} else {
    console.log('CSS already contains injection.');
}
