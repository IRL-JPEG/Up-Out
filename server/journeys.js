const { responseFor, responsePlan } = require("./response");
const { randomUUID } = require("node:crypto");
const { floors, clipPlan, actions } = require("../public/js/floors");

function fail(message, status = 409) { return Object.assign(new Error(message), { status }); }
class Journeys {
  constructor() { this.items = new Map(); }
  create(owner, floorId, preview, rehearsal = preview) {
    if (!floors[floorId]) throw fail("Choose a floor on the panel.", 400);
    for (const [id, j] of this.items) if (j.owner === owner || j.expires < Date.now()) this.items.delete(id);
    if (this.items.size >= 2000) throw fail("The lift is busy. Please try again shortly.", 503);
    const j = { id: randomUUID(), owner, floorId: floors[floorId].id, preview, rehearsal, state: "tour", expires: Date.now() + 4 * 3600000, validated: false };
    this.items.set(j.id, j); return j;
  }
  get(id, owner) {
    const j = this.items.get(id);
    if (!j || j.owner !== owner || j.expires < Date.now()) throw fail("This visit has ended. Choose the floor again.", 404);
    return j;
  }
  instruction(j, action) {
    if (j.state !== "choice") throw fail("The character's encounter starts after your first instruction.");
    if (!actions.includes(action)) throw fail("Unknown movement.", 400);
    j.action = action; j.state = "instruction";
  }
  plan(j) {
    if (!["tour", "instruction", "ask", "reunion"].includes(j.state)) throw fail("This part of the story is waiting for you.");
    if (!j.pending) j.pending = { ...responsePlan(clipPlan(floors[j.floorId], j.state, j.action), j.state === "reunion" ? j.result : null, floors[j.floorId]), playbackId: randomUUID() };
    return j.pending;
  }
  complete(j, playbackId) {
    if (typeof playbackId !== "string") throw fail("A completed clip is required.");
    if (j.lastPlayback === playbackId) return;
    if (!j.pending || j.pending.playbackId !== playbackId) throw fail("The clip does not belong to this story beat.");
    j.state = { tour: "choice", instruction: "ask", ask: "quest", reunion: j.result && !j.result.passed ? "quest" : "reward" }[j.state];
    j.lastPlayback = playbackId; j.pending = null;
  }
  acceptGrade(j, result) {
    if (j.state !== "quest") throw fail("Show your offering when the character asks for it.");
    const response = responseFor(result, floors[j.floorId]);
    j.validated = response.passed && !result.mock && !j.rehearsal;
    const passed = j.validated || (response.passed && result.mock && j.rehearsal);
    j.result = { ...response, passed, validated: j.validated, photoVerified: j.validated && response.evidenceType === "photo", id: randomUUID() };
    j.audio = null; j.pending = null; j.state = "reunion";
    return j.result;
  }
  requireReward(j) {
    if (j.state !== "reward" || !j.validated || j.rehearsal) throw fail("A checked offering and the character's reply unlock this keepsake.", 403);
  }
}
module.exports = { Journeys, fail };
