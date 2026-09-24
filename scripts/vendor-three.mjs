// Refresh the checked-in browser runtime from the locked development dependency.
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/three');
const destination = resolve(root, 'vendor/three');
const metadata = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
const project = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (metadata.version !== project.dependencies.three) throw new Error('Three.js version does not match package.json');
const pending = new Set(['build/three.module.js', 'build/three.core.js', 'LICENSE']);
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = resolve(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else if (/\.(js|mjs|html)$/.test(entry.name)) {
      const content = await readFile(filename, 'utf8');
      for (const match of content.matchAll(/['"]three\/addons\/([^'"]+\.js)['"]/g)) pending.add(`examples/jsm/${match[1]}`);
    }
  }
}
await scan(resolve(root, 'game'));
await scan(resolve(root, 'ship-preview'));
const hashes = {};
for (const name of pending) {
  const filename = resolve(source, name);
  if (!filename.startsWith(source + sep)) throw new Error(`Invalid dependency: ${name}`);
  const content = await readFile(filename);
  if (name.endsWith('.js')) {
    for (const match of content.toString().matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) {
      if (match[1] === 'three') continue;
      if (match[1].startsWith('three/addons/')) {
        pending.add(match[1].replace('three/addons/', 'examples/jsm/'));
        continue;
      }
      if (!match[1].startsWith('.')) throw new Error(`Unsupported import: ${match[1]}`);
      pending.add(relative(source, resolve(dirname(filename), match[1])).split(sep).join('/'));
    }
  }
  const target = resolve(destination, name);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(filename, target);
  hashes[name] = createHash('sha256').update(content).digest('hex');
}
await writeFile(resolve(destination, 'manifest.json'), JSON.stringify({ version: metadata.version, source: 'https://github.com/mrdoob/three.js', files: hashes }, null, 2) + '\n');
console.log(`Bundled Three.js ${metadata.version}: ${pending.size} files`);
