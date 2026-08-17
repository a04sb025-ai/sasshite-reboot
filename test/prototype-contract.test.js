import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');

test('the single scene contains every required interactive actor', () => {
  for (const id of ['scene', 'window', 'blind', 'blind-handle', 'grandmother', 'child', 'sun-ray']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('the game screen contains no forbidden success declaration', () => {
  for (const phrase of ['SUCCESS', 'ぴったり', '>正解<', '星評価']) assert.ok(!html.includes(phrase));
});

test('mobile interaction prevents scene scrolling and respects safe areas', () => {
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /overscroll-behavior:\s*none/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /100dvh/);
});

test('the handle exposes a touch target larger than 44 SVG units', () => {
  const target = html.match(/class="touch-target"[^>]*width="(\d+)"[^>]*height="(\d+)"/);
  assert.ok(target);
  assert.ok(Number(target[1]) >= 44 && Number(target[2]) >= 44);
});
