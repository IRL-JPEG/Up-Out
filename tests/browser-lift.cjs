const assert = require('node:assert/strict');
const { setup, openLift, floors } = require('./browser-helpers.cjs');
const panel = require('../public/js/lift-panel');

function within(promise, description) {
  let timer;
  return Promise.race([promise, new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${description}`)), 20000); })]).finally(() => clearTimeout(timer));
}

async function sourcePoint(page, point) {
  return page.locator('#overlay').evaluate((svg, value) => {
    const screen = new DOMPoint(value.x, value.y).matrixTransform(svg.getScreenCTM());
    return { x: screen.x, y: screen.y };
  }, point);
}
async function returned(page) {
  await page.waitForFunction(() => mode === 'idle' && document.querySelector('#app').dataset.liftPhase === 'idle');
  assert.equal(await page.locator('#overlay').evaluate(svg => svg.classList.contains('on')), true);
  assert.equal(await page.evaluate(() => journey), null);
}

(async () => {
  const h = await setup(), { page } = h, creates = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/journey' && request.method() === 'POST') creates.push(request.postDataJSON());
  });
  let unblock, resolveBlocked, resolveHandled;
  const blocked = new Promise(resolve => { resolveBlocked = resolve; });
  const handled = new Promise(resolve => { resolveHandled = resolve; });
  const release = new Promise(resolve => { unblock = resolve; });
  let holdNextClip = true;
  await page.route('**/api/journey/*/clip', async route => {
    if (!holdNextClip) return route.continue();
    holdNextClip = false;
    try {
      const response = await route.fetch();
      resolveBlocked();
      await release;
      await route.fulfill({ response });
    } catch (error) {
      // Returning to the lift deliberately aborts this suspended browser request.
      if (!/closed|cancel|abort|disposed|invalid interception/i.test(error.message)) throw error;
    } finally { resolveHandled(); }
  });
  try {
    await openLift(page, h.base);
    assert.equal(await page.locator('#overlay').getAttribute('viewBox'), '0 0 1280 2276');
    assert.equal(await page.locator('#overlay .hot[data-id]').count(), 38);
    const artwork = page.locator('img[src="/assets/lift/illustrated-panel.png"]');
    assert.equal(await artwork.count(), 1);
    await artwork.evaluate(image => image.decode());
    assert.deepEqual(await artwork.evaluate(image => [image.naturalWidth, image.naturalHeight]), [1280, 2276]);
    for (const section of panel.sections) {
      const control = page.locator(`#overlay .hot[data-id="${section.id}"]`);
      assert.equal(await control.getAttribute('role'), 'button');
      assert.equal(await control.getAttribute('tabindex'), '0');
      assert.ok(await control.getAttribute('aria-label'), `${section.id}: missing accessible name`);
      const point = await sourcePoint(page, section.focus);
      assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.hot')?.dataset.id, point), section.id, `${section.id}: painted target is covered or mapped incorrectly`);
    }
    await page.screenshot({ path: 'artifacts/lift-panel-mobile.png' });

    const unzoomedWidth = await page.locator('#overlay').evaluate(svg => svg.getBoundingClientRect().width);
    await page.locator('#panelZoom').click();
    assert.equal(await page.locator('#panelZoom').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(width => document.querySelector('#overlay').getBoundingClientRect().width > width * 1.7, unzoomedWidth);
    const enlargedWidth = await page.locator('#overlay').evaluate(svg => svg.getBoundingClientRect().width);
    assert.ok(Math.abs(enlargedWidth / unzoomedWidth - 1.85) < 0.03);
    assert.equal(await page.locator('#panelSections [data-section]').count(), 3);
    await page.locator('#panelSections [data-section="lower"]').click();
    await page.waitForFunction(() => document.querySelector('#panelViewport').scrollTop > 100);
    await page.screenshot({ path: 'artifacts/lift-panel-zoomed-mobile.png' });
    await page.locator('#panelSections [data-section="upper"]').click();
    await page.waitForFunction(() => document.querySelector('#panelViewport').scrollTop < 100);
    await page.locator('#panelZoom').click();
    assert.equal(await page.locator('#panelZoom').getAttribute('aria-pressed'), 'false');
    await page.waitForFunction(width => Math.abs(document.querySelector('#overlay').getBoundingClientRect().width - width) < 2, unzoomedWidth);

    // Two physical clicks on a painted control create just one visit. Hold its
    // prepared clip to prove the doors cannot reveal an unready room.
    const rink = panel.sections.find(section => section.id === 'cokernut-ice-rinks');
    const target = await sourcePoint(page, rink.focus);
    await page.mouse.click(target.x, target.y);
    await page.mouse.click(target.x, target.y);
    await within(blocked, 'the painted control must start preparing its room');
    await page.waitForFunction(() => document.querySelector('#app').dataset.liftPhase === 'travelling');
    assert.equal(creates.length, 1);
    assert.equal(creates[0].floorId, rink.id);
    assert.equal(await page.locator('#doors').evaluate(element => element.classList.contains('closed')), true);
    assert.equal(await page.locator('#choice').isVisible(), false);
    assert.equal(await page.locator('#storyStatus').isVisible(), false);
    await page.screenshot({ path: 'artifacts/lift-waiting-for-room-mobile.png' });
    await page.locator('#stepIn').click();
    await returned(page);
    unblock();
    await within(handled, 'the cancelled room request must settle');
    await page.waitForTimeout(1500);
    await returned(page);
    assert.equal(await page.locator('#doors').evaluate(element => element.classList.contains('closed')), true);
    assert.equal(await page.locator('#choice').isVisible(), false);
    assert.equal(creates.length, 1);

    // Accessible keyboard controls must visit their mapped floor, including one
    // near the bottom of the drawing, then return to the selectable panel.
    for (const [id, key] of [['chocolate-room', 'Enter'], ['spotty-powder-room', 'Space']]) {
      const control = page.locator(`#overlay .hot[data-id="${id}"]`);
      await control.focus();
      await control.press(key);
      await page.locator('#choice').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => journey.floorId), id);
      assert.equal(creates.at(-1).floorId, id);
      assert.equal(await page.locator('#app').getAttribute('data-lift-phase'), 'room');
      assert.equal(await page.locator('#doors').evaluate(element => element.classList.contains('closed')), false);
      const clip = h.clips.at(-1);
      assert.equal(clip.beat, 'tour');
      assert.deepEqual(clip.references, [floors[id].references[0]]);
      await page.locator('#stepIn').click();
      await returned(page);
    }
    assert.equal(creates.length, 3);
    assert.deepEqual(h.errors, []);
    console.log('PASS: 38 native-image targets, accessible names and keyboard routes, source-pixel hit mapping, mobile zoom/sections, one visit per double click, closed doors until room readiness, and cancellation without a late reveal. Providers are isolated fixtures.');
  } finally { unblock?.(); await h.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
