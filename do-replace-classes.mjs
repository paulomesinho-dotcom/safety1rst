import fs from 'fs';

const path = 'app/[locale]/project/[id]/workers/page.tsx';
let data = fs.readFileSync(path, 'utf8');

// The class we want to replace
const oldClass1 = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none';
const oldClass2 = 'w-full px-3 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-primary/20 outline-none';

// The new class from companies
const newClass = 'w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500';

// Replace standard inputs
data = data.split(oldClass1).join(newClass);
data = data.split(oldClass2).join(newClass);

// Also FieldControl labels
const oldLabel = 'text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between';
const newLabel = 'text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between';
data = data.split(oldLabel).join(newLabel);

// Another label variant might exist
const oldLabel2 = 'text-sm font-medium text-gray-700';
const newLabel2 = 'text-xs font-semibold text-gray-700';
data = data.split(oldLabel2).join(newLabel2);

fs.writeFileSync(path, data);
console.log('Replacement finished successfully');
