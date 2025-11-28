const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');

const files = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) files.push(full);
  }
};

collect(root);

const updated = [];

const removeSuffix = (specifier) => {
  if (!specifier.startsWith('.')) return specifier;
  if (specifier.endsWith('.ts')) return specifier.slice(0, -3);
  if (specifier.endsWith('/index.ts')) return specifier.slice(0, -9);
  return specifier;
};

const replaceFrom = /(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g;
const replaceExport = /(export\s+\*?\s*from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g;
const replaceImportCall = /(import\(\s*['"])(\.{1,2}\/[^'"]+?)(['"]\s*\))/g;

files.forEach((file) => {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;

  const transform = (match, start, spec, end) => {
    const newSpec = removeSuffix(spec);
    if (newSpec !== spec) {
      changed = true;
      return `${start}${newSpec}${end}`;
    }
    return match;
  };

  text = text.replace(replaceFrom, transform);
  text = text.replace(replaceExport, transform);
  text = text.replace(replaceImportCall, transform);

  if (changed) {
    fs.writeFileSync(file, text, 'utf8');
    updated.push(file);
  }
});

console.log(`Updated ${updated.length} files.`);



