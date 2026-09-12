/* Up and Out: the ride. Overlay hotspots, transit, doors, floors, the Storeroom 54 quest. */
// ------------------------------------------------------------ overlay: drawn hotspots over the panel
const NS = "http://www.w3.org/2000/svg";
const px = (p) => p * 12.8, py = (p) => p * 22.88;
function el(tag, attrs = {}, parent) { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (parent) parent.appendChild(n); return n; }
const hotEls = {};
for (const h of HOTS) {
  const g = el("g", { class: "hot", "data-id": h.id }, $("hots")); hotEls[h.id] = g;
  const [x1, y1, x2, y2] = h.plaque;
  if (h.drawPlaque) {
    // a plaque of our own, drawn in the panel's hand
    const pl = el("g", { class: "plaque", filter: "url(#wobble)" }, g);
    el("rect", { x: px(x1), y: py(y1), width: px(x2 - x1), height: py(y2 - y1), rx: 8, fill: h.wash, stroke: "#2b2a2e", "stroke-width": 4 }, pl);
    const t = el("text", { x: px((x1 + x2) / 2), y: py(y2) - 16, "text-anchor": "middle", style: "font-size:34px" }, pl); t.textContent = h.label;
  }
  // the switch state: a wash and an ink ring around the button that toggles
  const sw = el("g", { class: "sw" }, g);
  el("circle", { cx: px(h.sw[0]), cy: py(h.sw[1]), r: 46, fill: h.wash, opacity: 0.85, filter: "url(#glow)" }, sw);
  el("circle", { cx: px(h.sw[0]), cy: py(h.sw[1]), r: 34, fill: "none", stroke: "#2b2a2e", "stroke-width": 5, filter: "url(#wobble)" }, sw);
  const tick = el("path", { d: `M${px(h.sw[0]) - 14} ${py(h.sw[1]) + 2} l10 10 l20 -24`, fill: "none", stroke: "#2b2a2e", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#wobble)" }, sw);
  tick.setAttribute("class", "tick");
  // the hit area: the plaque and a generous circle around the switch
  el("rect", { class: "hit", x: px(x1) - 10, y: py(y1) - 10, width: px(x2 - x1) + 20, height: py(y2 - y1) + 20 }, g);
  el("circle", { class: "hit", cx: px(h.sw[0]), cy: py(h.sw[1]), r: 60 }, g);
  g.addEventListener("pointerup", (e) => { e.stopPropagation(); press(h); });
}

// ------------------------------------------------------------ dial
{
  const ticks = $("ticks");
  for (let i = 0; i <= 8; i++) { const a = (-70 + i * 17.5) * Math.PI / 180; const r1 = 128, r2 = 140;
    el("line", { x1: 180 + Math.sin(a) * r1, y1: 92 - Math.cos(a) * r1, x2: 180 + Math.sin(a) * r2, y2: 92 - Math.cos(a) * r2, stroke: "#2b2a2e", "stroke-width": 3, "stroke-linecap": "round" }, ticks); }
}
let needle = -70, needleTarget = -70;

// ------------------------------------------------------------ the ride
let mode = "intro";     // intro | idle | transit | open | out | quest | done
let floorsDone = 0; const visited = [];

$("iris").addEventListener("click", async () => {
  if (mode !== "intro") return; Audio.unlock(); $("iris").classList.add("gone");
  // If an intro.mp4 sits next to this file, play it first; the panel arrives on its last frame.
  let played = false;
  try { const r = await fetch("intro/intro.mp4", { method: "HEAD" }); if (r.ok) { played = await playIntro(); } } catch (e) {}
  if (!played) { $("panelWrap").classList.add("approach"); await wait(4200); }
  $("overlay").classList.add("on"); mode = "idle"; setLine("Choose a floor. Press a plaque.");
});
function playIntro() {
  return new Promise((resolve) => {
    const v = $("intro"); v.src = "intro/intro.mp4"; v.style.display = "block"; v.onended = () => { v.style.display = "none"; resolve(true); }; v.onerror = () => resolve(false); v.play().catch(() => resolve(false));
  });
}

function toggle(h, on) { hotEls[h.id].classList.toggle("on", on); }
async function press(h) {
  if (mode !== "idle") return;
  Audio.click(); const g = hotEls[h.id]; g.classList.add("pressed"); setTimeout(() => g.classList.remove("pressed"), 300);
  if (h.kind === "dud") { toggle(h, true); Audio.say(GAGS[Math.floor(Math.random() * GAGS.length)]); setTimeout(() => toggle(h, false), 1400); return; }
  if (h.kind === "upandout") { if (floorsDone < 3) { Audio.say("Not yet. Three floors first, then up and out."); return; } toggle(h, true); return finale(); }
  if (visited.includes(h.id)) { Audio.say("You have been there. The lift remembers, even if you do not."); return; }
  toggle(h, true); await ride(h);
}

async function ride(h) {
  mode = "transit"; visited.push(h.id); const w = h.kind === "quest" ? questWorld : world;
  $("panelWrap").classList.remove("arrive"); $("panelWrap").classList.add("transit"); $("overlay").classList.remove("on");
  Audio.setHum(0.09, 1.5); $("transit").classList.add("on"); $("dial").classList.add("shake"); $("dialText").textContent = h.label;
  needleTarget = h.id === "rainbow" ? 60 : h.id === "storeroom" ? -70 : h.id === "mint" ? -20 : 10;
  setState((w instanceof ReactorWorld ? "live" : "mock world") + " · in transit");

  let narrationDone = false, firstFrame = false, failed = false;
  const narration = Audio.say(h.transit).then(() => { narrationDone = true; });
  const staging = w.stage(h).then(() => { firstFrame = true; }).catch((e) => { log("stage failed: " + (e.message || e)); failed = true; });
  const hardTimeout = wait(45000).then(() => { failed = failed || !firstFrame; });
  await narration;
  let i = 0;
  while (!firstFrame && !failed) { await Promise.race([wait(4000), staging, hardTimeout]); if (firstFrame || failed) break; await Audio.say(STALLS[i++ % STALLS.length]); }
  if (failed && !firstFrame && !(w instanceof MockWorld)) { const m = new MockWorld(); await m.stage(h, { instant: true }); world = m; }
  Audio.ding(); Audio.setHum(0.02); $("dial").classList.remove("shake"); $("transit").classList.remove("on");
  $("world").classList.add("on"); $("doors").classList.remove("closed");
  floorsDone++; setPips(floorsDone); mode = "open";
  await wait(1200); await Audio.say(h.arrival);
  if (h.kind === "quest") return startQuest();
  mode = "out"; $("stepIn").hidden = false; $("pad").hidden = false;
  setLine("Hold the arrows to move. Press is forward, release is idle.");
}

$("stepIn").addEventListener("click", async () => {
  if (mode !== "out" && mode !== "quest" && mode !== "questDone") return;
  const w = currentWorld(); for (const k of ["fwd", "back", "left", "right"]) w.setMove(k, false);
  $("stepIn").hidden = true; $("pad").hidden = true; $("quest").classList.remove("on"); $("sign").classList.remove("on"); Audio.setWhisper(0);
  $("doors").classList.add("closed"); await wait(1400); $("world").classList.remove("on"); await w.leave();
  $("panelWrap").classList.remove("transit"); $("panelWrap").classList.add("arrive"); await wait(1500); $("overlay").classList.add("on");
  mode = "idle";
  setLine(floorsDone >= 3 ? "Three floors. The red lever at the top says Up and Out." : "Back in the lift. Press another plaque.");
});
function currentWorld() { return visited[visited.length - 1] === "storeroom" ? questWorld : world; }

// D-pad: press = held, release = idle
for (const btn of $("pad").querySelectorAll("button")) {
  const k = btn.dataset.k;
  const on = (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); currentWorld().setMove(k, true); };
  const off = (e) => { e.preventDefault(); currentWorld().setMove(k, false); };
  btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("pointerleave", off);
}
const KEYS = { w: "fwd", s: "back", a: "left", d: "right", ArrowUp: "fwd", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right" };
addEventListener("keydown", (e) => { if (mode !== "out") return; const k = KEYS[e.key]; if (k && !e.repeat) currentWorld().setMove(k, true); });
addEventListener("keyup", (e) => { if (mode !== "out") return; const k = KEYS[e.key]; if (k) currentWorld().setMove(k, false); });

// ------------------------------------------------------------ the quest: Storeroom 54 needs a light bulb
let whisperTimer = null, whisperAngle = 0;
async function startQuest() {
  mode = "quest"; $("stepIn").hidden = false; $("quest").classList.add("on"); $("verdict").textContent = ""; $("shot").classList.remove("on");
  Audio.setWhisper(0.35);
  // the whisper circles the listener in headphones (HRTF); on site this position comes from GPS + compass
  clearInterval(whisperTimer);
  whisperTimer = setInterval(() => { whisperAngle += 0.04; Audio.whisperAt(Math.sin(whisperAngle) * 3, -Math.cos(whisperAngle) * 3); }, 60);
  let i = 0; const loop = async () => { while (mode === "quest") { await Audio.say(WHISPERS[i++ % WHISPERS.length], { rate: 0.8, pitch: 1.3, volume: 0.6, silentLine: true }); await wait(4000); } };
  loop();
  setLine("Someone in the dark needs a light bulb.");
}
$("openCam").addEventListener("click", () => $("camInput").click());
$("noCam").addEventListener("click", () => grade(null));
$("camInput").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const dataUrl = await downscale(file, 1024); $("shot").src = dataUrl; $("shot").classList.add("on"); $("verdict").textContent = "Looking…";
  await grade(dataUrl); e.target.value = "";
});
function downscale(file, max) {
  return new Promise((resolve) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.85)); };
    img.src = url;
  });
}
// Grader: POST /api/grade (server-side Anthropic vision, or MOCK_AI). Falls back to a canned pass so the ride never breaks.
async function grade(dataUrl) {
  let result = null;
  if (dataUrl) {
    try {
      const r = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl, task: "a light bulb held in a hand" }) });
      if (r.ok) { result = await r.json(); log("graded by server" + (result.mock ? " (mock)" : "")); } else log("grader " + r.status + ": " + (await r.text()));
    } catch (e) { log("grader unreachable: " + e.message); }
  }
  if (!result) result = dataUrl ? { grade: "A", headline: "THAT IS A BULB", response: "Oh. Oh yes. That is a bulb, that is a hand, and I am about to be very happy." } : { grade: "A", headline: "TAKEN ON TRUST", response: "No camera? Then I shall take your word for it, which is a dangerous habit." };
  const pass = ["A*", "A", "B"].includes(result.grade);
  $("verdict").innerHTML = `<b>${result.grade} · ${result.headline}</b><br>${result.response}`;
  await Audio.say(result.response, { silentLine: true });
  if (pass) lightsOn(); else setLine("Not that. Try another photo.");
}
async function lightsOn() {
  mode = "questDone"; Audio.setWhisper(0); clearInterval(whisperTimer);
  questWorld.lightsOn(); await wait(900); Audio.ding(); $("sign").classList.add("on");
  hotEls.storeroom.classList.add("lit"); $("questText").textContent = "The lights are on. The Creams are open.";
  setLine("The lights come on in Storeroom 54. There is a sign inside.");
  await Audio.say("Light! Real light. Come in, come in, the creams are just through here.", { rate: 0.95, pitch: 1.2 });
}

async function finale() {
  mode = "transit"; $("panelWrap").classList.add("transit"); $("overlay").classList.remove("on");
  Audio.setHum(0.12, 2); $("transit").classList.add("on"); $("dial").classList.add("shake"); $("dialText").textContent = "Up and Out"; needleTarget = 70;
  if (world instanceof ReactorWorld) await world.end();
  const m = new MockWorld(); m.stage({ id: "sky", kind: "floor", palette: ["#0c1a3a", "#4a7fc9", "#fff2d6"] }, { instant: true }); world = m;
  await Audio.say("Going up. Past the roof. Past the weather. Past the bit where the building stops.");
  Audio.ding(); Audio.setHum(0, 3); $("dial").classList.remove("shake"); $("transit").classList.remove("on");
  $("world").classList.add("on"); $("doors").classList.remove("closed"); mode = "done"; setState("ride complete");
  await Audio.say(CODA);
}

// ------------------------------------------------------------ live drawer: token from the server, or pasted
let CONFIG = { model: "reactor/lingbot-world-2", live: false, grader: "mock" };
fetch("/api/config").then((r) => r.json()).then((c) => { CONFIG = c; $("model").value = c.model; setState(c.live ? "mock world · live available" : "mock world"); log(`server: live=${c.live} grader=${c.grader}`); }).catch(() => log("no /api/config; running as a static page"));
$("liveBtn").addEventListener("click", () => $("drawer").classList.add("open"));
$("closeDrawer").addEventListener("click", () => $("drawer").classList.remove("open"));
$("useLive").addEventListener("click", async () => {
  let jwt = $("jwt").value.trim(), model = $("model").value.trim() || CONFIG.model;
  if (jwt.startsWith("rk_")) { log("that is an API key, not a token."); return; }
  if (!jwt) {
    try { const r = await fetch("/api/token", { method: "POST" }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); jwt = j.jwt; model = j.model || model; log("token minted, expires " + new Date(j.expires_at * 1000).toLocaleTimeString()); }
    catch (e) { log("could not mint a token: " + e.message); return; }
  }
  if (world instanceof ReactorWorld) await world.end();
  world = new ReactorWorld(model, jwt); setState("live · ready"); log("live world armed for " + model); $("drawer").classList.remove("open");
});
$("useMock").addEventListener("click", async () => { if (world instanceof ReactorWorld) await world.end(); world = new MockWorld(); setState("mock world"); $("drawer").classList.remove("open"); });

// ------------------------------------------------------------ loop
function tick() {
  needle += (needleTarget - needle) * 0.02; $("needle").setAttribute("transform", `rotate(${needle} 180 92)`);
  world.tick?.(); questWorld.tick?.(); requestAnimationFrame(tick);
}
if ("speechSynthesis" in window) speechSynthesis.getVoices();
tick();
