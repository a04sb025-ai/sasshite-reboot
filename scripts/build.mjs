import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
for (const file of ['index.html', 'styles.css']) await cp(file, `dist/${file}`);
for (const file of ['game.js', 'logic.js']) await cp(`src/${file}`, `dist/src/${file}`);
console.log('Built static prototype in dist/');
