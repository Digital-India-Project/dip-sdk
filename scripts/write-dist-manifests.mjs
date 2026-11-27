import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const esmDir = path.join(root, 'dist', 'esm');
const cjsDir = path.join(root, 'dist', 'cjs');

fs.mkdirSync(esmDir, { recursive: true });
fs.mkdirSync(cjsDir, { recursive: true });

fs.writeFileSync(path.join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');
fs.writeFileSync(path.join(cjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
