import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const game = await readFile('src/game.js', 'utf8');

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

test('interactive SVG is a labelled group rather than an atomic image', () => {
  assert.match(html, /<svg[^>]*id="scene"[^>]*role="group"[^>]*aria-labelledby="scene-title scene-description"/);
  assert.doesNotMatch(html, /<svg[^>]*id="scene"[^>]*role="img"/);
});

test('the handle exposes a responsive minimum 48 CSS pixel touch target', () => {
  assert.match(game, /const minSvgSize = 48 \/ scale/);
  assert.match(game, /touchTarget\.setAttribute\('width'/);
  assert.match(game, /window\.addEventListener\('resize', resizeTouchTarget\)/);
});

test('restart cancels pending intro timers before scheduling a new intro', () => {
  assert.match(game, /function clearIntroTimers\(\)/);
  assert.match(game, /window\.clearTimeout/);
  assert.match(game, /function resetScene\(\) \{\n  clearIntroTimers\(\);/);
});
