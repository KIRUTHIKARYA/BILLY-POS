import fs from 'fs';
const content = fs.readFileSync('src/components/billing-screen.tsx', 'utf-8');
let open = 0;
let closed = 0;
for (let char of content) {
  if (char === '{') open++;
  if (char === '}') closed++;
}
console.log(`Open: ${open}, Closed: ${closed}`);
