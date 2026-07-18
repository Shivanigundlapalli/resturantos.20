const fs = require('fs');
const path = require('path');

function replaceColors(content, isCustomerFlow) {
  let modified = content;

  // Backgrounds
  modified = modified.replace(/\bbg-zinc-900\b/g, 'bg-warm-bg');
  // For the customer flow, they often use bg-zinc-950 as main wrapper
  if (isCustomerFlow) {
    modified = modified.replace(/\bbg-zinc-950\b/g, 'bg-warm-bg');
  } else {
    // Non-customer flow, maybe standard bg-warm-bg as well, unless it's sidebar which is already skipped
    modified = modified.replace(/\bbg-zinc-950\b/g, 'bg-warm-bg');
  }
  
  modified = modified.replace(/\bbg-zinc-800\b/g, 'bg-warm-card');
  modified = modified.replace(/\bbg-zinc-700\b/g, 'bg-warm-surface');
  modified = modified.replace(/\bhover:bg-zinc-900\b/g, 'hover:bg-warm-surface');
  modified = modified.replace(/\bhover:bg-zinc-800\b/g, 'hover:bg-warm-bg');
  modified = modified.replace(/\bbg-zinc-900\/50\b/g, 'bg-warm-bg/50');
  modified = modified.replace(/\bbg-zinc-800\/50\b/g, 'bg-warm-card/50');
  modified = modified.replace(/\bbg-zinc-900\/5\b/g, 'bg-warm-surface/50');

  // Text colors
  modified = modified.replace(/\btext-zinc-100\b/g, 'text-text-main');
  modified = modified.replace(/\btext-zinc-50\b/g, 'text-text-main');
  modified = modified.replace(/\btext-white\b/g, 'text-text-main');
  modified = modified.replace(/\btext-zinc-300\b/g, 'text-text-sec');
  modified = modified.replace(/\btext-zinc-400\b/g, 'text-text-sec');
  modified = modified.replace(/\btext-zinc-500\b/g, 'text-text-muted');
  modified = modified.replace(/\btext-amber-500-hover\b/g, 'text-text-sec'); 
  
  // Borders and Dividers
  modified = modified.replace(/\bborder-zinc-800\b/g, 'border-warm-border');
  modified = modified.replace(/\bborder-zinc-700\b/g, 'border-warm-border');
  modified = modified.replace(/\bborder-white\/5\b/g, 'border-warm-border');
  modified = modified.replace(/\bborder-white\/10\b/g, 'border-warm-border');
  modified = modified.replace(/\bdivide-zinc-800\b/g, 'divide-warm-border');
  modified = modified.replace(/\bdivide-zinc-900\b/g, 'divide-warm-border');

  // Accents / Buttons
  modified = modified.replace(/\bbg-amber-500\b/g, 'bg-forest-accent');
  modified = modified.replace(/\bhover:bg-amber-600\b/g, 'hover:bg-forest-hover');
  modified = modified.replace(/\btext-amber-500\b/g, 'text-forest-accent');
  modified = modified.replace(/\bborder-amber-500\/30\b/g, 'border-forest-accent/30');
  modified = modified.replace(/\bborder-amber-500\b/g, 'border-forest-accent');
  modified = modified.replace(/\bg-amber-50\b/g, 'bg-forest-accent/10');
  modified = modified.replace(/\btext-amber-700\b/g, 'text-forest-accent');

  // Shadows
  modified = modified.replace(/\bshadow-black\b/g, 'shadow-sm');
  modified = modified.replace(/\bshadow-xl\b/g, 'shadow-md');

  // Table Headers
  modified = modified.replace(/\bbg-zinc-950\/50\b/g, 'bg-warm-surface');
  modified = modified.replace(/\bbg-zinc-900\/80\b/g, 'bg-warm-surface');

  // Inputs
  modified = modified.replace(/\bbg-zinc-900\/50\b/g, 'bg-white');

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

const files = walkDir(path.join(__dirname, '..', 'src'));

let updatedCount = 0;
files.forEach((file) => {
  // Skip Sidebar because it was handled meticulously with Forest Green bg
  if (file.includes('Sidebar.tsx')) return;
  if (file.includes('AgentView.tsx')) return;
  if (file.includes('App.tsx')) return;

  const content = fs.readFileSync(file, 'utf8');
  const isCustomerFlow = file.includes('customer');
  const updatedContent = replaceColors(content, isCustomerFlow);

  if (content !== updatedContent) {
    fs.writeFileSync(file, updatedContent);
    console.log('Updated', file);
    updatedCount++;
  }
});

console.log(`\nCompleted global theme standardization! Updated ${updatedCount} files.`);
