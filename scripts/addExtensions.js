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
const unresolved = new Set();

const toPosix = (value) => value.replace(/\\/g, '/');

function resolveSpecifier(filePath, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  if (/\.(ts|js|json|node)$/.test(specifier)) return specifier;

  const dir = path.dirname(filePath);
  const normalized = toPosix(specifier);

  const directPath = path.resolve(dir, normalized + '.ts');
  if (fs.existsSync(directPath)) {
    return normalized + '.ts';
  }

  const indexPath = path.resolve(dir, normalized, 'index.ts');
  if (fs.existsSync(indexPath)) {
    return toPosix(path.join(normalized, 'index.ts'));
  }

  unresolved.add(`${filePath} => ${specifier}`);
  return specifier;
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replaceFrom = /(from\s+['"])([^'"]+)(['"])/g;
  content = content.replace(replaceFrom, (match, start, spec, end) => {
    const resolved = resolveSpecifier(file, spec);
    if (resolved !== spec) {
      changed = true;
      return `${start}${resolved}${end}`;
    }
    return match;
  });

  const replaceImportCall = /(import\(\s*['"])([^'"]+)(['"]\s*\))/g;
  content = content.replace(replaceImportCall, (match, start, spec, end) => {
    const resolved = resolveSpecifier(file, spec);
    if (resolved !== spec) {
      changed = true;
      return `${start}${resolved}${end}`;
    }
    return match;
  });

  const replaceExport = /(export\s+\*?\s*from\s+['"])([^'"]+)(['"])/g;
  content = content.replace(replaceExport, (match, start, spec, end) => {
    const resolved = resolveSpecifier(file, spec);
    if (resolved !== spec) {
      changed = true;
      return `${start}${resolved}${end}`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated.push(file);
  }
}

console.log(`Updated ${updated.length} files.`);
if (unresolved.size) {
  console.log('Unresolved specifiers:');
  for (const item of unresolved) {
    console.log('  ', item);
  }
}



