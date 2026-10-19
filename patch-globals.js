import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'app', 'globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/\[data-color="bim"\] \.bg-nav-sidebar/g, 'html:not(.dark)[data-color="bim"] .bg-nav-sidebar');
css = css.replace(/\[data-color="bim"\] \.border-nav-sidebar/g, 'html:not(.dark)[data-color="bim"] .border-nav-sidebar');
css = css.replace(/\[data-color="bim"\] body/g, 'html:not(.dark)[data-color="bim"] body');
css = css.replace(/\[data-color="bim"\] \.bg-background/g, 'html:not(.dark)[data-color="bim"] .bg-background');

fs.writeFileSync(cssPath, css);
console.log('Successfully patched globals.css');
