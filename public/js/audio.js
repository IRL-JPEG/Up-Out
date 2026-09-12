/* Up and Out: audio. Hum, ding, click, spoken lines (Web Speech stands in for the UNA library), and the spatial whisper bed. */
// ------------------------------------------------------------ audio: hum, ding, click, lines, whisper
const Audio = (() => {
  let ctx, humGain, whisperPanner, whisperGain;
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = 55; o2.frequency.value = 55.6;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
    humGain = ctx.createGain(); humGain.gain.value = 0;
    o1.connect(lp); o2.connect(lp); lp.connect(humGain); humGain.connect(ctx.destination); o1.start(); o2.start();
    // spatial whisper bed: a filtered noise source on an HRTF panner that circles the listener
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / 900));
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 1.2;
    whisperPanner = ctx.createPanner(); whisperPanner.panningModel = "HRTF"; whisperPanner.distanceModel = "inverse"; whisperPanner.refDistance = 1;
    whisperGain = ctx.createGain(); whisperGain.gain.value = 0;
    src.connect(bp); bp.connect(whisperPanner); whisperPanner.connect(whisperGain); whisperGain.connect(ctx.destination); src.start();
  }
  function unlock() { ensure(); if (ctx.state === "suspended") ctx.resume(); setHum(0.02); }
  function setHum(level, t = 1.2) { if (!ctx) return; humGain.gain.cancelScheduledValues(ctx.currentTime); humGain.gain.linearRampToValueAtTime(level, ctx.currentTime + t); }
  function setWhisper(level, t = 1.5) { if (!ctx) return; whisperGain.gain.cancelScheduledValues(ctx.currentTime); whisperGain.gain.linearRampToValueAtTime(level, ctx.currentTime + t); }
  function whisperAt(x, z) { if (whisperPanner) { whisperPanner.positionX.value = x; whisperPanner.positionY.value = 0; whisperPanner.positionZ.value = z; } }
  function ding() { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1046, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1.5); }
  function click() { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = 180; g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.08); }
  function say(text, opts = {}) {
    if (!opts.silentLine) setLine(text);
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { setTimeout(resolve, Math.max(1800, text.length * 55)); return; }
      const u = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const v = voices.find((x) => /en-GB/i.test(x.lang) && /female|Kate|Serena|Stephanie|Google UK English Female/i.test(x.name)) || voices.find((x) => /en-GB/i.test(x.lang)) || voices[0];
      if (v) u.voice = v; u.rate = opts.rate ?? 0.92; u.pitch = opts.pitch ?? 1.05; u.volume = opts.volume ?? 1;
      let done = false; const fin = () => { if (!done) { done = true; resolve(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, Math.max(2500, text.length * 90));
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }
  return { unlock, setHum, setWhisper, whisperAt, ding, click, say };
})();
