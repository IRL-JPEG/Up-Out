const { chromium } = require('playwright');
const fs = require('node:fs');
const { createApp } = require('../server/api');
const { floors } = require('../public/js/floors');

async function setup({ realQuests = false, grade, upstream, translate } = {}) {
  // Provider credentials are explicit fixtures. This harness never loads .env.
  process.env.MOCK_AI = realQuests ? '0' : '1';
  process.env.DEMO_MODE = '1';
  delete process.env.REACTOR_API_KEY;
  delete process.env.ELEVENLABS_AGENT_ID;
  if (realQuests) {
    process.env.ANTHROPIC_API_KEY = 'browser-fixture-no-network';
    process.env.ELEVENLABS_API_KEY = 'browser-fixture-no-network';
    process.env.ELEVENLABS_VOICE_ID = 'browser-character-voice';
  } else {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
  }
  fs.mkdirSync('artifacts', { recursive: true });
  const deps = { upstream: upstream || (async () => { throw new Error('Unexpected provider request in browser fixture'); }), ...(grade ? { grade } : {}), ...(translate ? { translate } : {}) };
  const server = createApp(deps).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  await context.addInitScript(() => {
    window.__spoken = [];
    window.__audioStarts = [];
    window.speechSynthesis.speak = u => { window.__spoken.push(u.text); setTimeout(() => u.onend?.(), 25); };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.tagName === 'AUDIO' && this.src.startsWith('blob:')) window.__audioStarts.push({ src: this.src, at: performance.now() });
      return play.apply(this, args);
    };
  });
  // Only local app requests are allowed; no accidental live provider requests.
  await context.route('**/*', route => /^https?:/.test(route.request().url()) && !route.request().url().startsWith(base) ? route.abort() : route.continue());
  const page = await context.newPage(), errors = [], clips = [];
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (/\/api\/journey\/[^/]+\/clip$/.test(response.url()) && response.ok()) response.json().then(clip => clips.push(clip)).catch(() => {});
  });
  return { browser, context, page, base, errors, clips, close: async () => { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}

async function openLift(page, base) {
  await page.goto(base);
  await page.locator('#iris').click();
  await page.waitForFunction(() => mode === 'idle');
}

async function visitChocolate(page) {
  await page.locator('#floorMenu').click();
  await page.locator('#wallTabs [data-wall="0"]').click();
  await page.locator('#roomSearch').fill('');
  await page.locator('#floorList').getByRole('button', { name: floors['chocolate-room'].label, exact: true }).click();
  await page.locator('#choice').waitFor({ state: 'visible' });
}

async function reachCamera(page) {
  await page.locator('#instruction').fill('Look toward the pink boat');
  await page.locator('#instructionForm button').click();
  await page.waitForFunction(() => document.querySelector('#quest').open && document.querySelector('#quest').classList.contains('camera-ready'));
}

function shortAudio() {
  // A real decodable PCM fixture exercises audio playback without paid synthesis.
  const rate = 8000, samples = 4000, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / rate) * 450), 44 + i * 2);
  return bytes;
}

module.exports = { setup, openLift, visitChocolate, reachCamera, shortAudio, floors };
