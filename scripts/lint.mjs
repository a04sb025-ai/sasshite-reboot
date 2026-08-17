import { readFile } from 'node:fs/promises';

const files = ['index.html', 'styles.css', 'src/game.js', 'src/logic.js'];
let failed = false;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (/\t/.test(source) || / +$/m.test(source)) {
    console.error(`${file}: tabs or trailing whitespace found`);
    failed = true;
  }
}
const html = await readFile('index.html', 'utf8');
const forbidden = ['SUCCESS', 'ぴったり', '>正解<', '星評価'];
for (const phrase of forbidden) {
  if (html.includes(phrase)) {
    console.error(`index.html: forbidden success UI phrase: ${phrase}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`Checked ${files.length} prototype files.`);
