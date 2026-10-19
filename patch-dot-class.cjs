const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/[locale]/project/[id]/companies/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/hasOpenTicket: getFieldProps\(([^,]+), ''\)\.hasOpenTicket,/g,
    "hasOpenTicket: getFieldProps($1, '').hasOpenTicket,\n                                                                    ticketDotClass: getFieldProps($1, '').ticketDotClass,");

// also for the custom docs loop!
content = content.replace(/hasOpenTicket: getFieldProps\(`custom_\$\{doc\.id\}`,\s*''\)\.hasOpenTicket,/g,
    "hasOpenTicket: getFieldProps(`custom_${doc.id}`, '').hasOpenTicket,\n                                                                    ticketDotClass: getFieldProps(`custom_${doc.id}`, '').ticketDotClass,");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched addRow calls to include ticketDotClass');
