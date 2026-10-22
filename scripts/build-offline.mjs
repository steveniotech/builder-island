// Deterministic local bundle; no dependencies or network access.
import fs from 'node:fs';
const read = file => fs.readFileSync(file, 'utf8');
const code = ['src/model.js', 'src/storage.js', 'src/app.js'].map(file => read(file)
  .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/gm, '')
  .replace(/\bexport\s+/g, '')).join('\n');
const bundle = read('index.html')
  .replace('<link rel="stylesheet" href="./styles.css" />', `<style>\n${read('styles.css')}</style>`)
  .replace('<script type="module" src="./src/app.js"></script>', `<script>\n(()=>{\n${code}\n})();\n</script>`);
if (process.argv.includes('--check')) {
  if (read('Builder-Island-Student.html') !== bundle) throw Error('Offline bundle is out of sync');
  console.log('Offline bundle matches HTML, CSS, and all source modules.');
} else fs.writeFileSync('Builder-Island-Student.html', bundle);
