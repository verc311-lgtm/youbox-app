import fs from 'fs';
let f = fs.readFileSync('src/pages/Register.tsx', 'utf8');
f = f.replace(/transition-colors text-sm/g, 'transition-colors text-base');
fs.writeFileSync('src/pages/Register.tsx', f);
