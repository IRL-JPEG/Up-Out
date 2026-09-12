/* ==========================================================================
   Up and Out: content (hotspots, lines, prompt layers) and small helpers
   Video approaches the lift; the last frame is a panel of buttons drawn as
   hotspots over the image. Press a plaque, the lift moves, the doors open on
   a world model floor (or on Storeroom 54, which needs a light bulb).
   ========================================================================== */

// ------------------------------------------------------------ hotspots (percent of image), fill later
// plaque = [x1, y1, x2, y2]; sw = the switch that visibly toggles. Kinds: floor | quest | dud | upandout
const HOTS = [
  { id: "mint", kind: "floor", label: "Mint Jujubes", plaque: [37, 15, 48, 21.5], sw: [32.5, 17.6], wash: "#cfe6d6",
    palette: ["#1d4a3a", "#5fa789", "#dff5e8"],
    transit: "Mint Jujubes for the boy next door. Down two floors and a bit to the left. Breathe out, it helps.",
    arrival: "Doors opening. Everything in here is cold and very, very green.",
    layers: base("A cool green sweet hall seen from a brass doorway, glass jars of pale mint jujubes on marble counters. The world contains EXACTLY ONE tall copper cooling tower in the centre at a fixed position AND EXACTLY ONE long marble counter on the right at a fixed position. Frosty green light, misted glass, faint sparkle. Storybook watercolour, soft edges.", "copper tower", "hall",
      "Frost creeps slowly up the tower, one jar lid lifting and settling, mist pooling on the counter.",
      "The viewpoint advances across the marble floor toward the tower, mist parting on either side, jars sliding past on the right.") },
  { id: "caramels", kind: "dud", label: "Cavity-Filling Caramels", plaque: [73, 18, 86, 22.5], sw: [71, 19], wash: "#d9b98f" },
  { id: "stickjaw", kind: "dud", label: "Stickjaw for Talkative Parents", plaque: [70, 26, 81, 31], sw: [84.5, 27.5], wash: "#e9e6a8" },
  { id: "wriggle", kind: "dud", label: "Wriggle-Sweets", plaque: [24, 35.5, 36, 40], sw: [37.6, 37.6], wash: "#d7c9e6" },
  { id: "invisible", kind: "dud", label: "Invisible Chocolate Bars", plaque: [48, 40, 59, 45], sw: [63, 41.5], wash: "#cfe0ee" },
  { id: "pencils", kind: "dud", label: "Sugar-Coated Pencils", plaque: [76, 41, 86, 45.5], sw: [88.5, 42.5], wash: "#e9e6a8" },
  { id: "fizzy", kind: "floor", label: "Fizzy Lemonade Swimming Pools", plaque: [28, 49, 40, 54], sw: [18, 51.5], wash: "#e9e6a8",
    palette: ["#5a4a0a", "#d9c23a", "#fff6b0"],
    transit: "Fizzy Lemonade Swimming Pools. Down seven floors. Hold your nose or your nose will hold you.",
    arrival: "Doors opening. Please do not drink the deep end.",
    layers: base("A vast yellow tiled pool hall seen from a brass doorway, lemonade fizzing in a wide pool with bubbles rising. The world contains EXACTLY ONE tall striped diving board in the centre at a fixed position AND EXACTLY ONE row of lemon-coloured changing huts on the left at a fixed position. Warm lemon light, wet tiles, drifting fizz. Storybook watercolour, soft edges.", "diving board", "pool hall",
      "Bubbles rise and burst on the surface, one hut door swinging gently, fizz drifting up past the board.",
      "The viewpoint advances along the wet tiles toward the diving board, bubbles streaming faster, huts sliding past on the left.") },
  { id: "fudge", kind: "dud", label: "Magic Hand-Fudge", plaque: [68, 57, 81, 61.5], sw: [75.5, 54.5], wash: "#d9b98f" },
  { id: "rainbow", kind: "floor", label: "Rainbow Drops", plaque: [48, 67, 56, 71], sw: [52, 64], wash: "#f2c9c9",
    palette: ["#2a1a4a", "#c95b9c", "#ffe4f2"],
    transit: "Rainbow Drops. Up nine. The colours arrive one at a time, so be patient with the blue.",
    arrival: "Doors opening. Mind the spectrum, it is freshly painted.",
    layers: base("A round pink laboratory seen from a brass doorway, rainbow drops falling from copper pipes into glass basins. The world contains EXACTLY ONE great glass funnel in the centre at a fixed position AND EXACTLY ONE curved rack of coloured bottles on the right at a fixed position. Rosy light, wet glass, spots of colour on the floor. Storybook watercolour, soft edges.", "glass funnel", "laboratory",
      "Drops fall one at a time from the funnel, one bottle glowing brighter then fading, a puddle of colour spreading slowly.",
      "The viewpoint advances across the spotted floor toward the funnel, drops falling faster, bottles sliding past on the right.") },
  { id: "storeroom", kind: "quest", label: "Storeroom 54, The Creams", plaque: [45, 81.5, 59, 85.5], sw: [42, 82], wash: "#cfe0ee",
    palette: ["#4a2c0d", "#b07a2a", "#f5d98a"],
    transit: "Storeroom fifty four. The creams. Right at the bottom. Nobody has been down there since the light went.",
    arrival: "Doors opening. It is very dark. Someone is whispering." },
  { id: "upandout", kind: "upandout", label: "Up and Out", plaque: [30, 8, 42, 10.4], sw: [36.3, 10.6], wash: "#f2c9c9", drawPlaque: true },
];
const GAGS = ["That one is just a button.", "Nothing happens. It hums a little, embarrassed.", "A very small door opens and closes again.", "The lift pretends not to have heard.", "That floor is closed for weather."];
const STALLS = ["The lift is thinking about nougat.", "Between floors. The hum gets thoughtful.", "Nearly there. The lift double checks."];
const WHISPERS = ["Is someone there? It is so dark.", "I dropped the bulb. I need another one.", "A light bulb. Any light bulb. Please.", "Bring it in your hand so I can see it."];
const CODA = "Up. And out. Three floors, one bulb, and a word for it: mintfizzlampish.";

function base(b, anchor, place, movStatic, movDynamic) {
  return {
    base: b,
    cameraStatic: `First-person view from the doorway, the ${anchor} locked at the exact centre of the frame at constant size and distance. Neither the ${anchor} nor the camera moves on its own; look-input is the only source of camera motion, arcing the camera around the stationary, centred ${anchor} only while held.`,
    cameraDynamic: `Strict first-person view, the ${anchor} holding steady at the centre of the frame as the viewpoint advances through the ${place}; look-input becomes the heading changing.`,
    movementStatic: movStatic, movementDynamic: movDynamic,
  };
}
function composePrompt(l, isMoving, held = []) { return [l.base, isMoving ? l.cameraDynamic : l.cameraStatic, isMoving ? l.movementDynamic : l.movementStatic, ...held].join(" ").trim(); }

// ------------------------------------------------------------ helpers
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setLine(t) { $("line").textContent = t; }
function setState(t) { $("state").textContent = t; }
function log(t) { const el = $("log"); el.textContent += "\n" + t; el.scrollTop = el.scrollHeight; }
function setPips(n) { [...$("pips").children].forEach((p, i) => p.classList.toggle("on", i < n)); }
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
