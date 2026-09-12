/* H3 uses generated clips and explicit playback, never held movement commands. */
function deadline(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
}
class PreviewWorld {
  constructor() { this.preview = true; this.closed = false; }
  async stage(floor, options = {}) {
    this.floor = floor;
    this.image = document.createElement("img"); this.image.className = "floor-image";
    this.image.alt = floor.label; this.image.src = floor.references[options.encounter ? 1 : 0];
    await this.image.decode();
    if(this.closed) throw new Error("Visit ended.");
    $("worldMedia").replaceChildren(this.image);
  }
  async prepare(plan) { this.plan = plan; }
  async play(onStarted) {
    const beat = this.plan.beat;
    this.image.src = this.floor.references[["ask", "reunion"].includes(beat) ? 1 : 0];
    await this.image.decode();
    this.image.className = `floor-image motion-${beat}`; this.image.style.animationPlayState = "running";
    if (onStarted) await onStarted();
    else if (beat === "ask") await Audio.say(this.floor.ask);
    else await wait(beat === "tour" ? 3500 : 2400);
    if (this.closed) throw new Error("Visit ended.");
  }
  async disconnect() {}
  holdFrame() { this.image.style.animationPlayState = "paused"; }
  async end() { this.closed = true; $("previewPip").hidden = true; }
}
class ReactorWorld {
  constructor(journeyId, sdk) {
    this.journeyId = journeyId; this.sdk = sdk; this.preview = false;
    this.references = new Map(); this.waiters = new Set(); this.epoch = 0; this.closed = false; this.diagnostics = [];
  }
  async stage(floor, options = {}) {
    this.floor = floor;
    this.poster = document.createElement("img"); this.poster.className = "floor-image";
    this.poster.src = floor.references[options.encounter ? 1 : 0]; this.poster.alt = floor.label;
    await this.poster.decode(); if(this.closed) throw new Error("Visit ended."); $("worldMedia").replaceChildren(this.poster);
    if (options.connect !== false) await this.connect();
  }
  async connect() {
    clearTimeout(this.idleTimer);
    if (this.closed) throw new Error("Visit ended.");
    if (this.reactor) return;
    const epoch = this.epoch;
    this.sdk ||= await import("/vendor/providers.js");
    const token = await api("/api/token", { journeyId: this.journeyId });
    if (this.closed || epoch !== this.epoch) throw new Error("Visit ended.");
    const reactor = this.reactor = new this.sdk.Reactor({ modelName: token.model });
    this.validCommands = null; this.references.clear(); this.lastClip = null;
    reactor.on("message", message => { if (this.reactor === reactor) this.onMessage(message); });
    reactor.on("error", error => { if (this.reactor === reactor) this.rejectAll(new Error(error.message || "Video connection interrupted.")); });
    reactor.on("statusChanged", status => {
      if (this.reactor !== reactor) return;
      if (status === "disconnected" || status === "error") this.rejectAll(new Error("The video connection ended. Retry this scene."));
    });
    reactor.on("trackReceived", (name, track) => {
      if (this.reactor !== reactor) return;
      if (name === "main_video") {
        this.video = document.createElement("video"); this.video.playsInline = true; this.video.muted = true;
        this.video.srcObject = new MediaStream([track]); this.video.autoplay = true;
        this.video.play().catch(() => {});
      }
      if (name === "main_audio") {
        this.audio = document.createElement("audio"); this.audio.srcObject = new MediaStream([track]);
        this.audio.muted = Boolean(this.plan?.externalVoice); this.audio.autoplay = true; this.audio.play().catch(() => { $("unmuteVideo").hidden = false; });
      }
    });
    await deadline(reactor.connect(token.jwt), 90000, "The video room is taking too long to connect. Retry this scene.");
    if (this.closed || epoch !== this.epoch) throw new Error("Visit ended.");
    // Request a fresh snapshot: initial connection broadcasts may precede the
    // client's subscription becoming active on a newly allocated session.
    const state = await deadline(reactor.sendCommand("get_state", {}), 30000, "The video room did not answer. Retry this scene.");
    if (state) this.onMessage(state.type ? state : { type: "state_update", data: state });
    await this.command("set_autoplay", { enabled: false });
    await this.command("set_flush_on_clip_end", { enabled: false });
    await this.command("set_canvas", { aspect: "9:16" });
  }
  onMessage(message) {
    const m = { ...message, ...(message.data || {}) };
    this.diagnostics.push({ type: m.type, keys: Object.keys(m), valid_commands: m.valid_commands });
    if(this.diagnostics.length > 100) this.diagnostics.shift();
    if (m.type === "state_update") this.validCommands = m.valid_commands;
    if (m.type === "command_error") this.rejectAll(new Error(m.reason || "The video model rejected this scene."));
    if (m.type === "clip_failed" && (!m.clip?.metadata || m.clip.metadata === this.plan?.playbackId)) this.rejectAll(new Error(m.reason || "The scene could not be generated. Try again."));
    for (const waiter of [...this.waiters]) if (waiter.test(m)) { this.waiters.delete(waiter); waiter.resolve(m); }
  }
  event(test, ms, label) {
    let entry;
    const promise = new Promise((resolve, reject) => { entry = { test, resolve, reject }; this.waiters.add(entry); });
    const timed = deadline(promise, ms, label).finally(() => this.waiters.delete(entry));
    // A broadcast can fail while its paired command is still awaiting its ack.
    timed.catch(() => {}); return timed;
  }
  rejectAll(error) { for (const waiter of this.waiters) waiter.reject(error); this.waiters.clear(); }
  async command(name, data) {
    this.lastCommand = name;
    if (this.closed || !this.reactor) throw new Error("The video session ended.");
    if (!this.validCommands?.includes(name)) await this.event(m => m.type === "state_update" && m.valid_commands?.includes(name), 30000, "The video room is not ready for this scene. Retry it.");
    return deadline(this.reactor.sendCommand(name, data), 45000, "The video room did not answer. Retry this scene.");
  }
  async prepare(plan) {
    this.plan = plan; if (this.audio) this.audio.muted = Boolean(plan.externalVoice); await this.connect();
    const refs = [];
    for (const path of plan.references) {
      if (!this.references.has(path)) {
        const r = await fetch(path); if (!r.ok) throw new Error("A floor reference image is missing.");
        const ref = await this.reactor.uploadFile(await r.blob(), { name: path.split("/").pop() });
        this.references.set(path, { upload_id: ref.uploadId });
      }
      refs.push(this.references.get(path));
    }
    const ready = this.event(m => m.type === "clip_generated" && m.clip?.metadata === plan.playbackId, 150000, "This scene is taking too long. Retry it when you are ready.");
    await this.command("enqueue", { prompt: plan.prompt, reference_images: refs, seconds: plan.seconds, metadata: plan.playbackId, ...(this.lastClip ? { continue_from_clip_id: this.lastClip } : {}) });
    const result = await ready;
    this.readyClip = result.clip.clip_id;
  }
  async play(onStarted) {
    const clipId = this.readyClip;
    const started = this.event(m => m.type === "clip_started" && m.clip?.clip_id === clipId, 30000, "The video could not start. Please retry.");
    const finished = this.event(m => m.type === "clip_finished" && (m.clip?.clip_id || m.clip_id) === clipId, 60000, "The video stopped before the scene finished. Please retry.");
    await this.command("play", { clip_id: clipId });
    await started;
    if (!this.video) await deadline(new Promise(resolve => {
      const check = () => { if (this.video || this.closed || !this.reactor) resolve(); else setTimeout(check, 100); }; check();
    }), 10000, "The video track did not arrive.");
    if (!this.video) throw new Error("The video track did not arrive.");
    $("worldMedia").replaceChildren(this.video);
    await this.video.play();
    this.responseFrames=[];
    if(this.plan?.beat==="reunion")this.momentCapture=new (typeof VerdictMoments!=="undefined"?VerdictMoments:require('./moments')).Capture(this.video,this.plan.seconds).start();
    const speech = onStarted ? Promise.resolve().then(onStarted) : Promise.resolve();
    speech.catch(() => {});
    if (this.audio) this.audio.play().catch(() => { $("unmuteVideo").hidden = false; });
    try { await finished; }
    catch(error){this.momentCapture?.cancel();this.momentCapture=null;throw error;}
    this.responseFrames=this.momentCapture?.finish()||[];this.momentCapture=null;
    if (onStarted) this.holdFrame();
    await speech;
    this.lastClip = clipId;
    this.idleTimer = setTimeout(() => this.disconnect().catch(() => {}), 45000);
  }
  holdFrame() {
    if (!this.video || this.video.readyState < 2) return;
    const still = document.createElement("canvas");
    still.width = this.video.videoWidth; still.height = this.video.videoHeight;
    still.getContext("2d").drawImage(this.video, 0, 0);
    still.setAttribute("aria-label", "The final frame of Pip's scene");
    $("worldMedia").replaceChildren(still);
  }
  async disconnect() {
    this.momentCapture?.cancel();this.momentCapture=null;
    this.holdFrame();
    clearTimeout(this.idleTimer); this.epoch++;
    this.rejectAll(new Error("Video session closed."));
    const reactor = this.reactor; this.reactor = null;
    this.audio?.pause(); if (this.audio) this.audio.srcObject = null;
    this.video?.pause(); if (this.video) this.video.srcObject = null;
    this.audio = null; this.video = null;
    this.references.clear(); this.lastClip = null; this.readyClip = null;
    if (reactor) await reactor.disconnect();
  }
  async end() { this.closed = true; await this.disconnect(); }
}
if (typeof module !== "undefined" && module.exports) module.exports = { ReactorWorld, PreviewWorld, deadline };
