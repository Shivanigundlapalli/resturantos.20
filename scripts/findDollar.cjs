const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walkDir(path.join(__dirname, '..', 'src'));
let found = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // We want to find cases where '$' is used as a currency symbol.
  // Common patterns:
  // - >$100<
  // - >${price}< 
  // - '$' + price
  // - \`$${price}\`
  
  // Checking for literally >$ followed by either a number or {
  const hasDollarCurrency = /\$([0-9]|\{)/.test(content) || /['"`]\$['"`]/.test(content);
  // Need to be careful because JS template literals use ${} which is not currency!
  // So we specifically check if it's rendered in JSX: \>\$
  const hasJSXDollar = /\>\s*\$/.test(content);
  // Or string concat: \`\$
  const hasTemplateDollar = /`\$([0-9]|\{)/.test(content);
  
  if (hasJSXDollar || hasTemplateDollar) {
    found.push(file);
  }
});
console.log('Files with possible $ symbols:');
found.forEach(f => console.log(f));
