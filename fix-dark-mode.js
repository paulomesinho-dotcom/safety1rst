import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Fix tailwind.config.js to enable class-based dark mode
const tailwindConfigPath = path.join(__dirname, 'tailwind.config.js');
let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');
if (!tailwindConfig.includes("darkMode:")) {
    tailwindConfig = tailwindConfig.replace('export default {', 'export default {\n  darkMode: "class",');
    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    console.log('Added darkMode: "class" to tailwind.config.js');
}

// 2. Fix the hover/focus/active prefixes that were broken by previous generic regex replace
function fixDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            const prefixes = ['hover', 'focus', 'active', 'group-hover'];

            prefixes.forEach(prefix => {
                content = content.replace(new RegExp(`${prefix}:bg-white dark:bg-surface`, 'g'), `${prefix}:bg-white dark:${prefix}:bg-surface`);
                content = content.replace(new RegExp(`${prefix}:bg-gray-50 dark:bg-\\[#131314\\]`, 'g'), `${prefix}:bg-gray-50 dark:${prefix}:bg-[#131314]`);
                content = content.replace(new RegExp(`${prefix}:bg-gray-100 dark:bg-surface`, 'g'), `${prefix}:bg-gray-100 dark:${prefix}:bg-surface`);

                content = content.replace(new RegExp(`${prefix}:text-gray-900 dark:text-white`, 'g'), `${prefix}:text-gray-900 dark:${prefix}:text-white`);
                content = content.replace(new RegExp(`${prefix}:text-gray-800 dark:text-gray-100`, 'g'), `${prefix}:text-gray-800 dark:${prefix}:text-gray-100`);
                content = content.replace(new RegExp(`${prefix}:text-gray-700 dark:text-gray-200`, 'g'), `${prefix}:text-gray-700 dark:${prefix}:text-gray-200`);
                content = content.replace(new RegExp(`${prefix}:text-gray-600 dark:text-gray-300`, 'g'), `${prefix}:text-gray-600 dark:${prefix}:text-gray-300`);

                content = content.replace(new RegExp(`${prefix}:border-gray-200 dark:border-\\[#444746\\]`, 'g'), `${prefix}:border-gray-200 dark:${prefix}:border-[#444746]`);
                content = content.replace(new RegExp(`${prefix}:border-gray-100 dark:border-\\[#444746\\]`, 'g'), `${prefix}:border-gray-100 dark:${prefix}:border-[#444746]`);
                content = content.replace(new RegExp(`${prefix}:border-gray-300 dark:border-\\[#444746\\]`, 'g'), `${prefix}:border-gray-300 dark:${prefix}:border-[#444746]`);
            });

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed prefixes in:', fullPath);
            }
        }
    });
}
fixDir(path.join(__dirname, 'src'));
fixDir(path.join(__dirname, 'app'));
