const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const panel = require('../public/js/lift-panel');
const { floors } = require('../public/js/floors');

function contains(region, point) {
  if (region.type === 'rect') return point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height;
  return ((point.x - region.cx) / region.rx) ** 2 + ((point.y - region.cy) / region.ry) ** 2 <= 1;
}
function centre(region) {
  return region.type === 'rect' ? { x: region.x + region.width / 2, y: region.y + region.height / 2 } : { x: region.cx, y: region.cy };
}

test('the lift map uses the supplied illustration pixels and exactly 38 canonical rooms', () => {
  const png = fs.readFileSync(path.join(__dirname, '../public/assets/lift/illustrated-panel.png'));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(panel.width, png.readUInt32BE(16));
  assert.equal(panel.height, png.readUInt32BE(20));
  assert.equal(panel.width, 1280);
  assert.equal(panel.height, 2276);
  assert.equal(panel.sections.length, 38);
  const expected = Object.values(floors).filter(floor => floor.wall <= 4).map(floor => floor.id).sort();
  assert.deepEqual(panel.sections.map(section => section.id).sort(), expected);
  assert.equal(new Set(panel.sections.map(section => section.id)).size, 38);
});

test('every painted control has finite in-bounds hit regions, a usable focus point and its own room assets', () => {
  for (const section of panel.sections) {
    assert.ok(section.label.trim(), `${section.id} needs an accessible name`);
    assert.ok(Array.isArray(section.regions) && section.regions.length, `${section.id} needs a painted target`);
    assert.ok(Number.isFinite(section.focus?.x) && Number.isFinite(section.focus?.y), `${section.id} needs a focus point`);
    for (const region of section.regions) {
      assert.ok(['rect', 'ellipse'].includes(region.type), `${section.id}: unsupported region ${region.type}`);
      const values = region.type === 'rect' ? [region.x, region.y, region.width, region.height] : [region.cx, region.cy, region.rx, region.ry];
      assert.ok(values.every(Number.isFinite), `${section.id}: non-finite geometry`);
      let left, top, right, bottom;
      if (region.type === 'rect') {
        assert.ok(region.width > 0 && region.height > 0, `${section.id}: empty rectangle`);
        assert.ok(region.rx === undefined || Number.isFinite(region.rx) && region.rx >= 0 && region.rx <= region.width / 2, `${section.id}: invalid rounded corner`);
        [left, top, right, bottom] = [region.x, region.y, region.x + region.width, region.y + region.height];
      } else {
        assert.ok(region.rx > 0 && region.ry > 0, `${section.id}: empty ellipse`);
        [left, top, right, bottom] = [region.cx - region.rx, region.cy - region.ry, region.cx + region.rx, region.cy + region.ry];
      }
      assert.ok(left >= 0 && top >= 0 && right <= panel.width && bottom <= panel.height, `${section.id}: target leaves the illustration`);
    }
    assert.ok(section.regions.some(region => contains(region, section.focus)), `${section.id}: focus point misses its own target`);
    for (const reference of floors[section.id].references) {
      assert.ok(reference.includes(`/${section.id}-`), `${section.id}: another room's image is referenced`);
      assert.ok(fs.statSync(path.join(__dirname, '../public', reference)).size > 1024, `${section.id}: missing or empty image`);
    }
  }
});

test('a room control centre or keyboard focus point cannot activate another room', () => {
  for (const section of panel.sections) {
    for (const point of [section.focus, ...section.regions.map(centre)]) {
      const hits = panel.sections.filter(candidate => candidate.regions.some(region => contains(region, point))).map(candidate => candidate.id);
      assert.deepEqual(hits, [section.id], `${section.id}: ambiguous target at ${point.x},${point.y}`);
    }
  }
});
