const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'docs/room-requests.json'), 'utf8').replace(/^\uFEFF/, ''));
const { floors, legacyAliases, clipPlan } = require('../public/js/floors');

test('all 45 supplied room requests preserve their wall order, casting and exact rubric', () => {
  const rooms = Object.values(floors);
  assert.equal(rooms.length, 45);
  assert.deepEqual(rooms.map(f => f.id), source.rooms.map(f => f.id));
  assert.deepEqual([1, 2, 3, 4, 5].map(w => rooms.filter(f => f.wall === w).length), [10, 10, 9, 9, 7]);
  assert.equal(new Set(rooms.map(f => f.character.id)).size, 45);
  for (const [index, room] of source.rooms.entries()) {
    const f = rooms[index];
    assert.equal(f.label, room.room);
    assert.equal(f.wall, room.wall);
    assert.equal(f.legend, index >= 38);
    assert.equal(f.ask, room.intro);
    assert.equal(f.quest.task, room.need);
    assert.equal(f.needShort, room.needShort);
    assert.equal(f.character.name, room.character.name);
    assert.equal(f.character.role, room.character.role);
    assert.equal(f.grading.roomBlock, room.grading.roomBlock);
    assert.equal(f.sharedGradingSystemPrompt, source.shared.gradingSystemPromptBase);
    assert.deepEqual(f.speech, room.speech);
    assert.ok(f.validationPrompt.includes('A hand in shot helps but is not required'));
    assert.ok(f.validationPrompt.includes('said or typed answer can reach A'));
  }
});

test('each portrait story introduces its room before its own worker, preserving the complete spoken request', () => {
  const allReferences = new Set();
  for (const f of Object.values(floors)) {
    const tour = clipPlan(f, 'tour');
    const instruction = clipPlan(f, 'instruction', 'look');
    const ask = clipPlan(f, 'ask');
    assert.equal(tour.references.length, 1);
    assert.equal(instruction.references.length, 1);
    assert.equal(ask.references.length, 2);
    assert.ok(tour.prompt.includes('halfway inside the open glass elevator'));
    assert.ok(instruction.prompt.includes(f.landmark));
    assert.ok(ask.prompt.includes(f.character.name));
    assert.ok(ask.prompt.includes(f.ask));
    assert.equal(ask.spokenScript, f.ask);
    assert.equal(ask.speechSegments.join(' '), f.ask);
    assert.equal(ask.holdForSpeech, true);
    for (const beat of ['tour', 'instruction', 'ask', 'reunion']) {
      const p = clipPlan(f, beat);
      assert.ok(p.prompt.includes('Portrait 9:16'));
      assert.ok(p.prompt.includes('Scratchy dip-pen ink'));
      assert.ok(p.prompt.length < 12000);
      assert.ok(p.seconds <= 15);
    }
    assert.deepEqual(f.references, [`/assets/rooms/${f.id}-arrival.png`, `/assets/rooms/${f.id}-encounter.png`]);
    for (const ref of f.references) allReferences.add(ref);
  }
  assert.equal(allReferences.size, 90);
});

test('legacy floor ids restore without duplicating the canonical directory in browser or server', () => {
  for (const [oldId, id] of Object.entries(legacyAliases)) {
    assert.equal(floors[oldId], floors[id]);
    assert.equal(Object.prototype.propertyIsEnumerable.call(floors, oldId), false);
  }
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of ['rooms-data.js', 'floors.js']) vm.runInContext(fs.readFileSync(path.join(root, 'public/js', file), 'utf8'), sandbox);
  const browser = sandbox.window.FloorContent;
  assert.equal(Object.values(browser.floors).length, 45);
  assert.equal(browser.floors.coconut.id, 'cokernut-ice-rinks');
  assert.deepEqual(Array.from(Object.keys(browser.floors)), Object.keys(floors));
});
