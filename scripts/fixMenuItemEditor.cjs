const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'owner', 'MenuItemEditor.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The input classes typically look like: className="w-full px-4 py-3 bg-warm-bg border ..."
// We inject 'text-text-main placeholder-text-muted' into any className string for input, select, textarea

const patterns = [
  /<input([^>]*)className=\"([^\"]*)\"/g,
  /<select([^>]*)className=\"([^\"]*)\"/g,
  /<textarea([^>]*)className=\"([^\"]*)\"/g
];

patterns.forEach(regex => {
  content = content.replace(regex, (match, beforeClass, classContent) => {
    // If it already has text-text-main or is hidden (like file inputs), skip
    if (classContent.includes('text-text-main') || classContent.includes('hidden')) return match;
    return match.replace(classContent, classContent + ' text-text-main placeholder-text-muted');
  });
});

fs.writeFileSync(filePath, content);
console.log('Fixed MenuItemEditor.tsx inputs');
