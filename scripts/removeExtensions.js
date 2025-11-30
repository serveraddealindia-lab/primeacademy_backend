const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const files = [];

function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
}

collect(root);

const updated = [];

function stripSpecifier(spec) {
  if (!spec.startsWith('.')) return spec;
  if (spec.endsWith('.ts')) return spec.slice(0, -3);
  if (spec.endsWith('/index.ts')) return spec.slice(0, -9);
  return spec;
}

const replaceFrom = /(from\s+['"])([^'"]+)(['"])/g;
const replaceExport = /(export\s+\*?\s*from\s+['"])([^'"]+)(['"])/g;
const replaceImportCall = /(import\(\s*['"])([^'"]+)(['"]\s*\))/g;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacer = (match, start, spec, end) => {
    const stripped = stripSpecifier(spec);
    if (stripped !== spec) {
      changed = true;
      return `${start}${stripped}${end}`;
    }
    return match;
  };

  const updatedContent = content
    .replace(replaceFrom, replacer)
    .replace(replaceExport, replacer)
    .replace(replaceImportCall, replacer);

  if (updatedContent !== content) {
    fs.writeFileSync(file, updatedContent, 'utf8');
    updated.push(file);
  }
}

console.log(`Updated ${updated.length} files.`);





