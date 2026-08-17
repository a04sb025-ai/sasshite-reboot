import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 4187;
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Development server did not start');
}

test('development server exposes only prototype assets', async (t) => {
  const server = spawn(process.execPath, ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });
  t.after(() => server.kill());
  await waitForServer();

  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/src/game.js`)).status, 200);
  for (const path of ['/.git/config', '/package.json', '/docs/concept.md', '/test/logic.test.js']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  }
});
