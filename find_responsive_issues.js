import fs from 'fs';
import path from 'path';

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allTsxFiles = findFiles('./src');
const issues = [];

for (const file of allTsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for fixed grid without responsive prefixes
    if (/className="[^"]*\bgrid-cols-[2-9]\b[^"]*"/.test(line) && !/className="[^"]*\b(sm:|md:|lg:|xl:)\b[^"]*"/.test(line)) {
      issues.push(`[Fixed Grid] ${file}:${i+1} - ${line.trim()}`);
    }
    
    // Check for large fixed widths without max-w-full or md:
    if (/className="[^"]*\b(w-\[?\d+(px)?\]?)\b[^"]*"/.test(line)) {
      const match = line.match(/\b(w-\[?\d+(px)?\]?)\b/)[1];
      if (['w-72', 'w-80', 'w-96'].includes(match) || match.includes('px')) {
        if (!/className="[^"]*\b(max-w-full|w-full|md:|sm:)\b[^"]*"/.test(line)) {
          issues.push(`[Fixed Width ${match}] ${file}:${i+1} - ${line.trim()}`);
        }
      }
    }
    
    // Check for un-wrapped tables
    if (line.includes('<table ')) {
      // Check previous line for overflow-x-auto
      const prevLine = i > 0 ? lines[i-1] : '';
      if (!prevLine.includes('overflow-x-auto') && !line.includes('overflow-x-auto')) {
        issues.push(`[Table no overflow] ${file}:${i+1} - ${line.trim()}`);
      }
    }
  }
}

fs.writeFileSync('responsive_issues.txt', issues.join('\n'));
console.log(`Found ${issues.length} potential responsiveness issues.`);
