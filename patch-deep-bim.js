import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'app', 'globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. First, we need to create the definition for [data-color="deep/bim"] by cloning the bim one
const deepBimDef = `
    [data-color="deep/bim"] {
        --nav-sidebar-bg: 15 23 42;
        --nav-sidebar-border: 57 202 204;
        --nav-active-bg: 30 41 59;
        --nav-active-text: 57 202 204;
        --background: 15 23 42;
        --row-hover-bg: 248 250 252;
    }
`;

if (!css.includes('[data-color="deep/bim"]')) {
    css = css.replace(/\[data-color="bim"\]\s*\{[^}]+\}/, match => match + '\n' + deepBimDef);
}

// 2. We need to copy the sidebar glassmorphism to deep/bim too
if (!css.includes('html:not(.dark)[data-color="deep/bim"] .bg-nav-sidebar')) {
    css = css.replace(/html:not\(\.dark\)\[data-color="bim"\] \.bg-nav-sidebar\s*\{[^}]+\}/, match => match + '\n' + match.replace(/bim/g, 'deep/bim'));
    css = css.replace(/html:not\(\.dark\)\[data-color="bim"\] \.border-nav-sidebar\s*\{[^}]+\}/, match => match + '\n' + match.replace(/bim/g, 'deep/bim'));
}

// 3. For the body background, we REMOVE it from bim and assign it entirely to deep/bim, OR we keep a simpler one for bim?
// The user said: "no tema BIM, podes acrescentar mais alguns elementos tecnologicos no background das colunas?". Originally BIM just had a solid background `15 23 42`.
// Let's migrate ALL the recent tech additions (lines 149-217) entirely to deep/bim.
// We'll just replace `[data-color="bim"]` with `[data-color="deep/bim"]` in those specific tech blocks.

// The text "Apply technological blueprint gradient background for BIM theme" marks the start of the heavy tech stuff.
const techStartStr = "/* Apply technological blueprint gradient background for BIM theme */";
let beforeTech = css.substring(0, css.indexOf(techStartStr));
let techBlock = css.substring(css.indexOf(techStartStr), css.indexOf('html,\n    body {'));

// Swap "bim" to "deep/bim" in the entire tech block
techBlock = techBlock.replace(/data-color="bim"/g, 'data-color="deep/bim"');

// 4. NOW fix the opaqueness for deep/bim in the main containers
// Current: background-color: rgba(15, 23, 42, 0.6) !important;
// We change it to opaque: rgba(15, 23, 42, 1) !important;
techBlock = techBlock.replace(/background-color: rgba\(15, 23, 42, 0\.6\)/g, 'background-color: rgba(15, 23, 42, 1)');

// Put them back together
css = beforeTech + techBlock + css.substring(css.indexOf('html,\n    body {'));

fs.writeFileSync(cssPath, css);
console.log('Successfully created deep/bim and restored bim.');
