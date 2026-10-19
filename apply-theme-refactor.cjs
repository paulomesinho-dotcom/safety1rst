const fs = require('fs');
const path = require('path');

const replacements = [
    // Backgrounds
    { from: 'bg-blue-600', to: 'bg-primary' },
    { from: 'bg-blue-700', to: 'bg-primary-hover' },
    { from: 'hover:bg-blue-600', to: 'hover:bg-primary' },
    { from: 'hover:bg-blue-700', to: 'hover:bg-primary-hover' },
    { from: 'bg-blue-50', to: 'bg-primary-light' },
    { from: 'hover:bg-blue-50', to: 'hover:bg-primary-light' },

    // Text
    { from: 'text-blue-600', to: 'text-primary' },
    { from: 'text-blue-700', to: 'text-primary-hover' },
    { from: 'text-blue-500', to: 'text-primary' }, // Often used for icons, map to primary
    { from: 'hover:text-blue-600', to: 'hover:text-primary' },
    { from: 'hover:text-blue-700', to: 'hover:text-primary-hover' },
    { from: 'hover:text-blue-500', to: 'hover:text-primary' },

    // Borders
    { from: 'border-blue-600', to: 'border-primary' },
    { from: 'border-blue-200', to: 'border-primary/20' },
    { from: 'border-blue-100', to: 'border-primary/10' },
    { from: 'hover:border-blue-300', to: 'hover:border-primary/30' },

    { from: 'ring-blue-500', to: 'ring-primary' },
    { from: 'ring-blue-600', to: 'ring-primary' },
    { from: 'shadow-blue-500/20', to: 'shadow-primary/20' },

    // Additional Lighter Shades
    { from: 'bg-blue-100', to: 'bg-primary-light' },
    { from: 'hover:bg-blue-100', to: 'hover:bg-primary-light' },
    { from: 'border-blue-400', to: 'border-primary' },
    { from: 'focus:border-blue-400', to: 'focus:border-primary' },
    { from: 'focus:ring-blue-100', to: 'focus:ring-primary-light' },
    { from: 'text-blue-400', to: 'text-primary' }, // Map to primary for simplicity
    { from: 'border-blue-300', to: 'border-primary/30' },
];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const dirsToScan = [
    './src/components',
    './app'
];

dirsToScan.forEach(dir => {
    try {
        const files = getAllFiles(dir);
        files.forEach(file => {
            let content = fs.readFileSync(file, 'utf8');
            let originalContent = content;

            // Apply replacements
            replacements.forEach(rep => {
                // Use global regex replace to catch all instances
                const regex = new RegExp(rep.from.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                content = content.replace(regex, rep.to);
            });

            if (content !== originalContent) {
                console.log(`Modifying: ${file}`);
                fs.writeFileSync(file, content, 'utf8');
            }
        });
    } catch (e) {
        console.error(`Error processing directory ${dir}:`, e);
    }
});

console.log('Replacement complete.');
