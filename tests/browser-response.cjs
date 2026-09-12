const assert = require('node:assert/strict');
const { setup, openLift, visitChocolate, reachCamera, shortAudio, floors } = require('./browser-helpers.cjs');
(async () => {
  const calls = [], grades = [], recordings = [], audio = shortAudio();
  const replies = [
    { grade: 'F', observedObject: 'a red toy brick', visualDetails: 'a solid red plastic rectangle', response: "A red toy brick! Our waterfall has tried tipping it, but not even one glug came out. It has decided the brick is having a quiet day.\nBring a little jug tomorrow,\nAnd wash away our drippy sorrow." },
    { grade: 'A*', observedObject: 'a blue pouring jug', visualDetails: 'blue jug pouring water into a bowl', response: "A blue jug, pouring proper water! The waterfall is watching every glug with its very best eyes. There it goes, trickling again. I shall give your jug a tiny medal.\nYour clever pouring saved the day,\nAnd sent our chocolate on its way." },
    { grade: 'A*', observedObject: 'a little teapot', visualDetails: 'described in a written answer', response: "A little teapot sounds just right! I have told the waterfall about its clever spout, and now it is practising its own glug. It thinks tea is a kind of rain.\nYour teapot tale has shown the way,\nTo pour a little joy today." },
  ];
  const h = await setup({ realQuests: true,
    translate: async () => 'look',
    grade: async (image, floor, rehearsal, answer) => {
      assert.equal(floor.id, 'chocolate-room'); assert.equal(rehearsal, false);
      calls.push({ image, answer }); const r = replies[calls.length - 1];
      if (!r) throw new Error('Unexpected extra grade call');
      return { ...r, provenance: answer ? 'user_text' : 'real_world', evidenceType: answer ? 'text' : 'photo', flag: false, mock: false, headline: answer ? 'A LOVELY TEAPOT TALE' : r.grade === 'F' ? 'THE BRICK STAYS DRY' : 'A PROPER LITTLE POUR', ttsResponse: `[warmly] ${r.response.replace('\n', '\n[short pause] ')}` };
    },
    upstream: async (url, options) => {
      assert.ok(url.startsWith('https://api.elevenlabs.io/v1/text-to-speech/browser-character-voice?'));
      recordings.push(JSON.parse(options.body));
      return new Response(audio, { headers: { 'Content-Type': 'audio/wav' } });
    },
  });
  const { page } = h;
  await page.addInitScript(() => {
    window.__responsePresentation = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.tagName === 'AUDIO' && this.src.startsWith('blob:') && typeof journey !== 'undefined' && journey?.state === 'reunion') {
        window.__responsePresentation.push({ hidden: document.querySelector('#ticket').hidden, text: document.querySelector('#line').textContent });
      }
      return play.apply(this, args);
    };
  });
  page.on('response', response => { if (response.url().endsWith('/api/grade') && response.ok()) response.json().then(r => grades.push(r)).catch(() => {}); });
  try {
    await openLift(page, h.base);
    await page.locator('#liveBtn').click(); await page.locator('#useIllustrated').click();
    await visitChocolate(page); await reachCamera(page);
    assert.equal(await page.evaluate(() => journey.preview), true);
    assert.equal(await page.evaluate(() => journey.rehearsal), false);
    assert.equal(recordings[0].text, floors['chocolate-room'].ask);
    for (const grade of ['F', 'A*']) {
      await page.waitForFunction(() => document.querySelector('#quest').classList.contains('camera-ready'));
      await page.locator('#takePhoto').click();
      const photo = await page.locator('#shot').getAttribute('src');
      await page.locator('#submitPhoto').click();
      await page.locator('#reward').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#resultStamp').innerText(), grade);
      assert.equal(await page.locator('#resultPhoto').getAttribute('src'), photo);
      assert.equal(await page.locator('#resultCharacter').innerText(), 'Mossop has spoken');
      assert.ok((await page.locator('#rewardText').innerText()).includes(grade === 'F' ? 'red toy brick' : 'blue jug'));
      const responseClip = h.clips.filter(p => p.beat === 'reunion').at(-1);
      assert.ok(responseClip.prompt.includes(grade === 'F' ? 'red toy brick' : 'blue pouring jug'));
      assert.ok(responseClip.prompt.includes('Mossop'));
      assert.ok(responseClip.prompt.includes('Redraw the offered object entirely in this same illustration style'));
      assert.deepEqual(await page.evaluate(() => window.__responsePresentation.at(-1)), { hidden: true, text: '' });
      assert.equal(responseClip.externalVoice, true);
      assert.equal(responseClip.dialogue, grades.at(-1).response);
      if (grade === 'F') {
        assert.equal(await page.evaluate(() => journey.state), 'quest');
        assert.equal(await page.locator('#retryResult').isVisible(), true);
        const denied = await page.evaluate(async () => (await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journeyId: journey.id }) })).status);
        assert.equal(denied, 403);
        await page.screenshot({ path: 'artifacts/retry-grade-mobile.png' });
        await page.reload(); await page.locator('#iris').click();
        await page.locator('#reward').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#resultStamp').innerText(), 'F');
        assert.equal(await page.locator('#resultPhoto').getAttribute('src'), photo);
        await page.locator('#retryResult').click();
      }
    }
    assert.equal(calls.length, 2);
    assert.equal(await page.evaluate(() => journey.result.validated), true);
    assert.equal(await page.locator('#retryResult').isVisible(), false);
    await page.screenshot({ path: 'artifacts/graded-reward-mobile.png' });
    await page.locator('#playReward').click();
    await page.locator('#downloadReward').waitFor({ state: 'visible' });
    assert.match(await page.locator('#downloadReward').getAttribute('download'), /chocolate-room-verdict\.mp3$/);
    assert.equal(recordings.length, 3); // full ask, failed reply, successful reply; replay is cached
    assert.ok(await page.evaluate(() => window.__audioStarts.length >= 2));
    await page.locator('#stepIn').click(); await page.waitForFunction(() => mode === 'idle');
    await visitChocolate(page); await reachCamera(page);
    await page.locator('#typeAnswer').click();
    assert.equal(await page.locator('#spokenAnswer').getAttribute('maxlength'), '500');
    assert.equal(await page.locator('#cameraView').evaluate(v => v.srcObject), null);
    const oversized = await page.evaluate(async () => (await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journeyId: journey.id, answer: 'x'.repeat(501) }) })).status);
    assert.equal(oversized, 400); assert.equal(calls.length, 2);
    const answer = 'I found my little teapot. It has a curved spout and it pours tea into cups.';
    await page.locator('#spokenAnswer').fill(answer); await page.locator('#submitAnswer').click();
    await page.locator('#reward').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#resultStamp').innerText(), 'A');
    assert.equal(await page.locator('#resultPhoto').isVisible(), false);
    assert.equal(await page.locator('#resultAnswer').innerText(), answer);
    assert.equal(calls[2].answer, answer); assert.equal(calls[2].image, undefined);
    assert.equal(grades[2].grade, 'A'); assert.equal(grades[2].evidenceType, 'text');
    await page.screenshot({ path: 'artifacts/typed-verdict-mobile.png' });
    await page.reload(); await page.locator('#iris').click(); await page.locator('#reward').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#resultAnswer').innerText(), answer);
    assert.equal(await page.locator('#resultStamp').innerText(), 'A');
    assert.equal(recordings.length, 5);
    assert.deepEqual(h.errors, []);
    console.log('PASS: isolated illustrated real-quest flow, full Eleven request, failed photo verdict with retry/reload, successful photo-backed grade, matching personalised video/script, cached playable keepsake, typed-answer A cap and 500-character boundary. All providers are fixtures.');
  } finally { await h.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
