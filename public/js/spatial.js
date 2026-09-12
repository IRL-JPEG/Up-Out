/* Up and Out: spatial audio starter.
   One Web Audio listener, two pose providers, sources placed in metres.
   Read docs/spatial-audio-handoff.md before extending this.

   Conventions (do not change without changing the doc):
     x = metres east of the start fix, y = up, z = metres SOUTH of the start fix,
     so facing north means looking down -z, which is Web Audio's default forward.
     headingDeg is compass heading, 0 = north, 90 = east.
*/
const Spatial = (() => {
  let ctx = null, listener = null;
  const sources = new Map();
  let pose = { x: 0, z: 0, headingDeg: 0 };

  function attach(audioContext) { ctx = audioContext; listener = ctx.listener; applyListener(); }

  function applyListener() {
    if (!listener) return;
    const h = (pose.headingDeg * Math.PI) / 180;
    const fx = Math.sin(h), fz = -Math.cos(h);
    const t = ctx.currentTime;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(pose.x, t, 0.05); listener.positionY.setTargetAtTime(1.5, t, 0.05); listener.positionZ.setTargetAtTime(pose.z, t, 0.05);
      listener.forwardX.setTargetAtTime(fx, t, 0.05); listener.forwardY.setTargetAtTime(0, t, 0.05); listener.forwardZ.setTargetAtTime(fz, t, 0.05);
      listener.upX.setTargetAtTime(0, t, 0.05); listener.upY.setTargetAtTime(1, t, 0.05); listener.upZ.setTargetAtTime(0, t, 0.05);
    } else {
      listener.setPosition(pose.x, 1.5, pose.z); listener.setOrientation(fx, 0, fz, 0, 1, 0);   // older Safari
    }
  }

  function setPose(p) { pose = { ...pose, ...p }; applyListener(); tick(); }
  function getPose() { return { ...pose }; }

  // node -> lowpass -> panner (HRTF) -> gain -> destination
  function addSource(id, node, o = {}) {
    const opts = { x: 0, z: 0, refDistance: 6, maxDistance: 250, rolloff: 1.4, lowpassNear: 8000, lowpassFar: 350, gain: 1, ...o };
    const lowpass = ctx.createBiquadFilter(); lowpass.type = "lowpass"; lowpass.frequency.value = opts.lowpassNear;
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF"; panner.distanceModel = "inverse";
    panner.refDistance = opts.refDistance; panner.maxDistance = opts.maxDistance; panner.rolloffFactor = opts.rolloff;
    const gain = ctx.createGain(); gain.gain.value = opts.gain;
    node.connect(lowpass); lowpass.connect(panner); panner.connect(gain); gain.connect(ctx.destination);
    const src = { panner, gain, lowpass, opts, pos: { x: opts.x, z: opts.z } };
    sources.set(id, src); placePanner(src); return src;
  }
  function placePanner(src) {
    const t = ctx.currentTime;
    if (src.panner.positionX) { src.panner.positionX.setTargetAtTime(src.pos.x, t, 0.05); src.panner.positionY.setTargetAtTime(1.5, t, 0.05); src.panner.positionZ.setTargetAtTime(src.pos.z, t, 0.05); }
    else src.panner.setPosition(src.pos.x, 1.5, src.pos.z);
  }
  function moveSource(id, x, z) { const s = sources.get(id); if (!s) return; s.pos = { x, z }; placePanner(s); }
  function setGain(id, g, ramp = 1) { const s = sources.get(id); if (s) s.gain.gain.linearRampToValueAtTime(g, ctx.currentTime + ramp); }
  function removeSource(id) { const s = sources.get(id); if (!s) return; s.gain.disconnect(); sources.delete(id); }
  function distanceTo(id) { const s = sources.get(id); if (!s) return Infinity; return Math.hypot(s.pos.x - pose.x, s.pos.z - pose.z); }
  function bearingTo(id) { const s = sources.get(id); if (!s) return 0; return ((Math.atan2(s.pos.x - pose.x, -(s.pos.z - pose.z)) * 180) / Math.PI + 360) % 360; }

  // The panner handles loudness by distance; muffling by distance is ours.
  function tick() {
    if (!ctx) return;
    for (const [id] of sources) {
      const s = sources.get(id), d = distanceTo(id);
      const k = Math.min(1, Math.max(0, Math.log10(1 + d) / Math.log10(1 + s.opts.maxDistance)));
      const cutoff = s.opts.lowpassNear * Math.pow(s.opts.lowpassFar / s.opts.lowpassNear, k);
      s.lowpass.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.2);
    }
  }

  // ---------------------------------------------------------------- geo helpers
  const R = 6371000;
  function metresFrom(start, fix) {
    const dLat = ((fix.lat - start.lat) * Math.PI) / 180, dLng = ((fix.lng - start.lng) * Math.PI) / 180;
    const east = dLng * R * Math.cos((start.lat * Math.PI) / 180), north = dLat * R;
    return { x: east, z: -north };
  }
  function anchorFrom(bearingDeg, distanceM) {
    const b = (bearingDeg * Math.PI) / 180; return { x: Math.sin(b) * distanceM, z: -Math.cos(b) * distanceM };
  }

  // ---------------------------------------------------------------- pose providers
  // On screen: the three.js camera is the listener.
  function CameraPose(camera) {
    let raf = 0;
    const read = () => { const e = camera.rotation; setPose({ x: camera.position.x, z: camera.position.z, headingDeg: ((-e.y * 180) / Math.PI + 360) % 360 }); raf = requestAnimationFrame(read); };
    return { start() { read(); }, stop() { cancelAnimationFrame(raf); } };
  }

  // Outside: GPS for position, the phone's compass for heading. Call start() from a tap (permissions).
  function WorldPose(opts = {}) {
    const o = { arrivalRadius: 12, dwellMs: 3000, alpha: 0.35, maxJumpM: 25, ...opts };
    let start = null, watchId = null, heading = 0, smooth = null, onArrive = () => {}, arrivals = new Map();
    async function requestPermissions() {
      if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { try { await DeviceOrientationEvent.requestPermission(); } catch (e) {} }
      if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) { try { await DeviceMotionEvent.requestPermission(); } catch (e) {} }
    }
    function onOrientation(e) {
      if (typeof e.webkitCompassHeading === "number") heading = e.webkitCompassHeading;          // iOS
      else if (e.absolute && typeof e.alpha === "number") heading = (360 - e.alpha) % 360;       // Android
      setPose({ headingDeg: heading });
    }
    function onFix(p) {
      const fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
      if (!start) { start = fix; smooth = { x: 0, z: 0 }; setPose({ x: 0, z: 0 }); return; }
      const m = metresFrom(start, fix);
      if (smooth && Math.hypot(m.x - smooth.x, m.z - smooth.z) > o.maxJumpM && fix.acc > 20) return;    // discard wild jumps from poor fixes
      smooth = smooth ? { x: smooth.x + (m.x - smooth.x) * o.alpha, z: smooth.z + (m.z - smooth.z) * o.alpha } : m;
      setPose({ x: smooth.x, z: smooth.z });
      checkArrivals();
    }
    function checkArrivals() {
      const now = Date.now();
      for (const [id, a] of arrivals) {
        const inside = distanceTo(id) <= o.arrivalRadius;
        if (inside && !a.since) a.since = now;
        if (!inside) a.since = null;
        if (inside && a.since && now - a.since >= o.dwellMs && !a.fired) { a.fired = true; onArrive(id); }
      }
    }
    return {
      async start() {
        await requestPermissions();
        addEventListener("deviceorientationabsolute", onOrientation); addEventListener("deviceorientation", onOrientation);
        watchId = navigator.geolocation.watchPosition(onFix, (e) => console.warn("geo", e.message), { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
        try { await navigator.wakeLock?.request("screen"); } catch (e) {}
      },
      stop() { removeEventListener("deviceorientationabsolute", onOrientation); removeEventListener("deviceorientation", onOrientation); if (watchId != null) navigator.geolocation.clearWatch(watchId); },
      watchArrival(id) { arrivals.set(id, { since: null, fired: false }); },
      rearm(id) { arrivals.set(id, { since: null, fired: false }); },
      onArrive(fn) { onArrive = fn; },
      get startFix() { return start; },
    };
  }

  return { attach, setPose, getPose, addSource, moveSource, setGain, removeSource, distanceTo, bearingTo, tick, metresFrom, anchorFrom, CameraPose, WorldPose };
})();
