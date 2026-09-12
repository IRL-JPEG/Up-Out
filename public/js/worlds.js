/* Up and Out: worlds. The painted still doubles as the mock floor and as the seed image; ReactorWorld streams LingBot World 2. */
// ------------------------------------------------------------ the still (seed image) painter, also the mock world
function makeStill(floor) {
  const c = document.createElement("canvas"); c.width = 1664; c.height = 960; const g = c.getContext("2d");
  const rng = mulberry32(hash(floor.id));
  const motes = Array.from({ length: 40 }, () => ({ x: rng(), y: rng(), r: 6 + rng() * 22, s: 0.2 + rng() * 0.8, p: rng() * 6.28 }));
  function paint(t = 0, live = false, pan = { x: 0, z: 0 }, lit = 1) {
    const [a, b, hi] = floor.palette; const W = c.width, H = c.height;
    g.save(); const zoom = 1 + pan.z * 0.25; g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2 + pan.x * 180, -H / 2);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, hi); sky.addColorStop(0.55, b); sky.addColorStop(1, a);
    g.fillStyle = sky; g.fillRect(-W, -H, W * 3, H * 3);
    g.fillStyle = a; g.globalAlpha = 0.85; g.fillRect(-W, H * 0.66, W * 3, H); g.globalAlpha = 1;
    g.strokeStyle = hi; g.globalAlpha = 0.18; g.lineWidth = 3;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(W / 2, H * 0.52); g.lineTo(W / 2 + i * 260, H * 1.2); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = hi; g.beginPath(); g.ellipse(W / 2, H * 0.55, 210, 150, 0, 0, 6.28); g.fill();
    g.fillStyle = b; g.beginPath(); g.ellipse(W / 2, H * 0.55, 150, 105, 0, 0, 6.28); g.fill();
    g.fillStyle = a; g.globalAlpha = 0.7; g.fillRect(W * 0.72, H * 0.28, 260, 400); g.globalAlpha = 1;
    g.fillStyle = hi;
    for (const m of motes) {
      const yy = live ? (m.y - (t * 0.02 * m.s) % 1 + 1) % 1 : m.y; const xx = m.x + (live ? Math.sin(t * 0.6 + m.p) * 0.01 : 0);
      g.globalAlpha = 0.35 + 0.3 * Math.sin(t + m.p); g.beginPath(); g.arc(xx * W, yy * H, m.r, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1; g.restore();
    // darkness: the storeroom starts almost black and lights up when the bulb arrives
    if (lit < 1) { g.fillStyle = `rgba(4,4,10,${0.96 - lit * 0.96})`; g.fillRect(0, 0, W, H); }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  paint(0, false);
  return { canvas: c, paint };
}

// ------------------------------------------------------------ worlds (same interface, the lift never knows which it has)
function showWorldElement(el) { const w = $("world"); [...w.querySelectorAll("canvas, video")].forEach((n) => n.remove()); w.prepend(el); }
class MockWorld {
  constructor() { this.isLive = false; this.pan = { x: 0, z: 0 }; this.keys = {}; this.t0 = performance.now(); this.lit = 1; }
  async stage(floor, { instant = false } = {}) {
    this.still = makeStill(floor); this.element = this.still.canvas; this.floor = floor; this.isLive = false; this.lit = floor.kind === "quest" ? 0.1 : 1;
    showWorldElement(this.element); setState("mock world · warming up");
    if (!instant) await wait(floor.kind === "quest" ? 2500 : 6500 + Math.random() * 4000);
    this.isLive = true; setState("mock world · live");
  }
  tick() {
    if (!this.still) return; const t = (performance.now() - this.t0) / 1000;
    if (this.keys.fwd) this.pan.z = Math.min(2.5, this.pan.z + 0.01); if (this.keys.back) this.pan.z = Math.max(0, this.pan.z - 0.01);
    if (this.keys.left) this.pan.x = Math.min(1.5, this.pan.x + 0.01); if (this.keys.right) this.pan.x = Math.max(-1.5, this.pan.x - 0.01);
    if (this.litTarget !== undefined) this.lit += (this.litTarget - this.lit) * 0.03;
    this.still.paint(t, this.isLive, this.pan, this.lit);
  }
  setMove(k, on) { this.keys[k] = on; }
  lightsOn() { this.litTarget = 1; }
  async leave() { this.isLive = false; this.pan = { x: 0, z: 0 }; setState("mock world"); }
}
class ReactorWorld {
  constructor(model, jwt) { this.model = model; this.jwt = jwt; this.isLive = false; this.moving = { fwd: false, back: false, left: false, right: false }; }
  async ensureSdk() { if (this.sdk) return; log("importing @reactor-team/js-sdk from esm.sh"); this.sdk = await import("https://esm.sh/@reactor-team/js-sdk@3.0.2"); }
  async seedBlob(floor, still) {
    // Reference image per floor: seeds/<id>.jpg next to this file. Falls back to the painted still.
    try { const r = await fetch(`seeds/${floor.id}.jpg`); if (r.ok) { log(`reference image seeds/${floor.id}.jpg`); return await r.blob(); } } catch (e) {}
    log("no reference image, uploading the painted still");
    return new Promise((r) => still.canvas.toBlob(r, "image/jpeg", 0.92));
  }
  async stage(floor) {
    await this.ensureSdk(); this.floor = floor; this.isLive = false; this.held = []; this.lastPrompt = null;
    const still = makeStill(floor); this.element = still.canvas; showWorldElement(still.canvas);
    const { Reactor } = this.sdk;
    if (!this.reactor) {
      this.reactor = new Reactor({ modelName: this.model });
      this.reactor.on("statusChanged", (s) => { log("status " + s); setState("live · " + s); });
      this.reactor.on("error", (e) => log(`error ${e.operation}: [${e.code}] ${e.message}`));
      this.reactor.on("message", (m) => this.onMessage(m));
      this.reactor.on("trackReceived", (name, track, stream) => {
        if (name !== "main_video") return; log("track main_video");
        const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = stream; v.play().catch(() => {}); this.video = v;
      });
      log("connecting " + this.model); await this.reactor.connect(this.jwt); log("session " + this.reactor.getSessionId());
    } else { await this.reactor.sendCommand("reset", {}); await wait(600); }
    const imageAccepted = new Promise((r) => (this._imageOk = r)); const firstChunk = new Promise((r) => (this._firstChunk = r));
    const blob = await this.seedBlob(floor, still);
    const ref = await this.reactor.uploadFile(blob, { name: floor.id + ".jpg" });
    await this.reactor.sendCommand("set_image", { image: ref }); await imageAccepted;
    await this.reactor.sendCommand("set_seed", { seed: hash(floor.id) % 100000 });
    await this.sendPrompt(); await this.reactor.sendCommand("start", {}); log("start sent; waiting for first chunk");
    await firstChunk; if (this.video) { this.element = this.video; showWorldElement(this.video); }
    this.isLive = true; setState("live · streaming");
  }
  onMessage(m) {
    if (m.type === "image_accepted") { log(`image ${m.data.width}×${m.data.height}`); this._imageOk?.(); }
    if (m.type === "chunk_complete" && m.data.chunk_index === 0) { log("first chunk"); this._firstChunk?.(); }
    if (m.type === "command_error") log(`command_error ${m.data.command}: ${m.data.reason}`);
  }
  async sendPrompt() {
    const isMoving = Object.values(this.moving).some(Boolean);
    const p = composePrompt(this.floor.layers, isMoving, this.held); if (p === this.lastPrompt) return; this.lastPrompt = p;
    await this.reactor.sendCommand("set_prompt", { prompt: p });
  }
  tick() {}
  async setMove(k, on) {
    if (!this.reactor || !this.isLive) return; this.moving[k] = on;
    if (k === "fwd" || k === "back") await this.reactor.sendCommand("set_move_longitudinal", { move_longitudinal: on ? (k === "fwd" ? "forward" : "back") : "idle" });
    else await this.reactor.sendCommand("set_look_horizontal", { look_horizontal: on ? k : "idle" });
    await this.sendPrompt();
  }
  lightsOn() {}
  async leave() { this.isLive = false; if (this.reactor) { try { await this.reactor.sendCommand("pause", {}); } catch (e) {} } setState("live · paused (billing continues)"); }
  async end() { if (this.reactor) { await this.reactor.disconnect(); this.reactor = null; log("session terminated"); } }
}
let world = new MockWorld();
let questWorld = new MockWorld();   // the quest floor never uses the world model
