const fs = require('fs');
const path = require('path');

function replaceCustomerGreens(content) {
  let modified = content;

  // Replace old greens with customer primary
  modified = modified.replace(/\bbg-forest-accent\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-green-400\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-green-500\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-green-600\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-green-700\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-emerald-400\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-emerald-500\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-emerald-600\b/g, 'bg-customer-primary');
  modified = modified.replace(/\bbg-success\b/g, 'bg-customer-primary');

  // Hover and active states
  modified = modified.replace(/\bhover:bg-forest-hover\b/g, 'hover:bg-customer-hover');
  modified = modified.replace(/\bhover:bg-green-500\b/g, 'hover:bg-customer-hover');
  modified = modified.replace(/\bhover:bg-green-600\b/g, 'hover:bg-customer-hover');
  modified = modified.replace(/\bhover:bg-emerald-500\b/g, 'hover:bg-customer-hover');
  modified = modified.replace(/\bhover:bg-emerald-600\b/g, 'hover:bg-customer-hover');
  
  modified = modified.replace(/\bactive:bg-forest-pressed\b/g, 'active:bg-customer-pressed');
  modified = modified.replace(/\bactive:bg-green-700\b/g, 'active:bg-customer-pressed');
  modified = modified.replace(/\bactive:bg-emerald-700\b/g, 'active:bg-customer-pressed');

  // Text and Icons
  modified = modified.replace(/\btext-forest-accent\b/g, 'text-customer-primary');
  modified = modified.replace(/\btext-green-500\b/g, 'text-customer-primary');
  modified = modified.replace(/\btext-green-600\b/g, 'text-customer-primary');
  modified = modified.replace(/\btext-emerald-500\b/g, 'text-customer-primary');
  modified = modified.replace(/\btext-emerald-600\b/g, 'text-customer-primary');
  modified = modified.replace(/\btext-success\b/g, 'text-customer-primary');

  // Borders
  modified = modified.replace(/\bborder-forest-accent\b/g, 'border-customer-primary');
  modified = modified.replace(/\bborder-green-500\b/g, 'border-customer-primary');
  modified = modified.replace(/\bborder-emerald-500\b/g, 'border-customer-primary');
  modified = modified.replace(/\bborder-success\b/g, 'border-customer-primary');

  // Light Backgrounds
  modified = modified.replace(/\bbg-forest-accent\/10\b/g, 'bg-customer-light');
  modified = modified.replace(/\bbg-green-500\/10\b/g, 'bg-customer-light');
  modified = modified.replace(/\bbg-emerald-500\/10\b/g, 'bg-customer-light');
  modified = modified.replace(/\bbg-green-50\b/g, 'bg-customer-light');
  modified = modified.replace(/\bbg-emerald-50\b/g, 'bg-customer-light');

  // Fix text contrast on primary background (Ensure white text on dark green)
  // We'll search for common button/badge wrappers and make sure text is white.
  // We can just replace text-zinc-950 with text-white if it accompanies the new primary green.
  // E.g., class="... bg-customer-primary text-zinc-950 ..." -> class="... bg-customer-primary text-white ..."
  // A safe regex replacing `text-zinc-950` with `text-white` specifically where `bg-customer-primary` is used:
  
  modified = modified.replace(/bg-customer-primary([^"}]*)text-zinc-950/g, 'bg-customer-primary$1text-white');
  modified = modified.replace(/text-zinc-950([^"}]*)bg-customer-primary/g, 'text-white$1bg-customer-primary');

  return modified;
}

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

const files = walkDir(path.join(__dirname, '..', 'src', 'customer'));

let updatedCount = 0;
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const updatedContent = replaceCustomerGreens(content);

  if (content !== updatedContent) {
    fs.writeFileSync(file, updatedContent);
    console.log('Updated', file);
    updatedCount++;
  }
});

console.log(`\nCompleted customer green standardization! Updated ${updatedCount} files.`);
