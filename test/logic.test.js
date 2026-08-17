import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRoughness, deriveNpcState, smoothstep, updateAfterProgress } from '../src/logic.js';

test('smoothstep is continuous and clamped', () => {
  assert.equal(smoothstep(0.2, 0.8, 0), 0);
  assert.equal(smoothstep(0.2, 0.8, 1), 1);
  assert.ok(smoothstep(0.2, 0.8, 0.49) < smoothstep(0.2, 0.8, 0.51));
});

test('NPC states trade glare relief for the child view continuously', () => {
  const open = deriveNpcState(0, 1);
  const middle = deriveNpcState(0.52, 1);
  const closed = deriveNpcState(1, 1);
  assert.ok(open.glare > middle.glare && middle.glare > closed.glare);
  assert.ok(open.childComfort > middle.childComfort && middle.childComfort > closed.childComfort);
  assert.ok(middle.sharedComfort > open.sharedComfort);
  assert.ok(middle.sharedComfort > closed.sharedComfort);
  const nearby = deriveNpcState(0.521, 1);
  assert.ok(Math.abs(nearby.grandmotherComfort - middle.grandmotherComfort) < 0.01);
  assert.ok(Math.abs(nearby.childComfort - middle.childComfort) < 0.01);
});

test('a broad range gives both NPCs readable comfort, not a pixel target', () => {
  const comfortable = [];
  for (let position = 0; position <= 1; position += 0.01) {
    if (deriveNpcState(position, 1).sharedComfort > 0.67) comfortable.push(position);
  }
  assert.ok(comfortable.length >= 12, `expected broad range, got ${comfortable.length}%`);
});

test('After progress accumulates and reverses without locking input', () => {
  assert.ok(updateAfterProgress(0.5, 0.8, 0.1) > 0.5);
  assert.ok(updateAfterProgress(0.5, 0.3, 0.1) < 0.5);
});

test('rough movement detects repeated reversals', () => {
  const calm = [{ time: 0, position: 0.2 }, { time: 100, position: 0.25 }, { time: 200, position: 0.3 }];
  const rough = [{ time: 0, position: 0.1 }, { time: 100, position: 0.8 }, { time: 200, position: 0.15 }, { time: 300, position: 0.85 }];
  assert.ok(calculateRoughness(rough) > calculateRoughness(calm) + 1);
});
