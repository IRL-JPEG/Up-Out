# Up and Out on Reactor: study and build plan

*Saturday 12 September 2026. Written against the live Reactor docs (js-sdk 3.0.2, `@reactor-models/lingbot-world-2` 1.0.1, `@reactor-models/happy-oyster` 1.0.0, `@reactor-models/ltx2` 5.0.2) and the live pricing endpoint.*

## 0. The one-paragraph version

Reactor gives you a GPU session that streams steerable AI video over WebRTC. You open a session, wait for a GPU, upload a seed image and a prose prompt, call `start`, and frames arrive on a `MediaStreamTrack`. Everything after that is `sendCommand()`: move, look, hot-swap the prompt. That maps onto Up and Out almost too neatly. UNA already decides *which* room you get and *what happens there* deterministically; Reactor renders it live. The lift stays a real, deterministic three.js object you build once and never regenerate. The world model only ever renders what is on the far side of the doors. The lift ride is the GPU warm-up, dressed as narrative.

## 1. Architecture in one picture

```
 ┌──────────────────────────────── client (React / three.js) ─────────────────────────────────┐
 │                                                                                             │
 │   LiftScene (three.js, deterministic)             WorldPortal (Reactor typed SDK)           │
 │   ┌─────────────────────────────┐                 ┌─────────────────────────────────┐       │
 │   │ 4 walls of buttons (JSON)   │  press ───────▶ │ connect → ready → set_image →   │       │
 │   │ swipe to rotate walls       │                 │ set_prompt → start → chunks      │       │
 │   │ doors (2 sliding panels)    │ ◀── first ───── │ main_video MediaStreamTrack      │       │
 │   │ doorway plane (VideoTexture)│     stable      │ state / chunk_complete events    │       │
 │   │ hum + narration audio       │     frame       │ setPrompt() on story beats       │       │
 │   └─────────────────────────────┘                 └─────────────────────────────────┘       │
 │            │                                              ▲                                  │
 │            │ button id, rider state                       │ floor manifest                   │
 │            ▼                                              │ (seed image, layers, seed)       │
 └────────────┼──────────────────────────────────────────────┼──────────────────────────────────┘
              ▼                                              │
 ┌──────────────────────────── UNA (Node/Express, existing) ─┴──────────────────────────────────┐
 │  ride graph → 3 rooms → carry state → narration audio (ElevenLabs library on R2)              │
 │  NEW: per-room `world` block → composes layered LingBot prompt + picks seed image + seed       │
 │  NEW: story beats emit `event` clauses the client appends to the prompt while active           │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼  POST /api/token (server only, holds rk_ key)
 ┌───────────────────────────────┐
 │ api.reactor.inc/tokens        │  session-scoped JWT, models: [reactor/lingbot-world-2]
 └───────────────────────────────┘
```

Three boundaries matter:

1. **UNA owns meaning.** Which room, which beats, which lines, what the rider carries. It also owns the prompt text, because the prompt guide's layered format is exactly the kind of pre-approved fragment library UNA already is.
2. **three.js owns the lift.** Geometry, buttons, doors, camera. Never generated at runtime. Textures can be generated once (nano banana panels from your button JSON) and baked.
3. **Reactor owns the floor.** One session, one floor at a time. The client only ever sees a video track and a state snapshot.

## 2. The consistency problem, answered

Your instinct is right and the docs make it a hard rule rather than a preference. World models condition on their own recent frames and drift under long holds; the prompt guide says identity morphs and colours smear, and a released key cannot restore a world that has drifted. A lift with dozens of legible tiny button labels is the worst possible subject for that. So:

- **The lift is never a world-model subject.** It is a three.js interior with a fixed camera rig and four wall meshes. The button JSON you already have (label, colour, rim, texture, size, per wall) becomes button meshes with raycast picking. Swiping rotates the camera between walls, which replaces the AI video transition you had planned for the Blake interface with a deterministic one (and you can still cross-fade a Blake-style illustrated overlay if you want the drawn look).
- **The doorway is the only seam.** Behind the doors sits a plane that carries a `THREE.VideoTexture` of the Reactor `main_video` track. The door frame masks the video's edges, so aspect ratio and resolution changes never show.
- **The seed image is the first frame.** LingBot World 2 is image-anchored: when image and prompt disagree, the image wins. That gives you a free trick: paint the seed still onto the doorway plane while the model is warming up, open the doors onto the still, and swap to the live track when the first stable chunk lands. The child sees the room "come alive"; nobody sees a loader.

That last point also solves the seam aesthetically. Author each floor's seed image as *the view from the lift doorway*, first-person, the room's landmark centred. The prompt's camera layer then uses the first-person anchor variant from the guide, so the model keeps rendering from the threshold outward.

## 3. Which model for the floors

Pricing from the live endpoint on 12 Sep 2026 (`GET https://api.reactor.inc/pricing`). Rates are per session-second, billed from session creation to termination, including idle time and the 30-second reconnect window.

| Model | Slug | What it is | Fit for a floor | $/s | $/hr |
|---|---|---|---|---|---|
| **LingBot World 2** | `reactor/lingbot-world-2` | Image-anchored navigable world; 1664×960 @ 48 fps; WASD two-axis, arrow look, `set_camera_pose`, prompt hot-swap per chunk, seed control | **Primary.** Seed image fixes identity, prompt is layered, seed is deterministic. UNA's "deterministic scene data as prompter" direction lands here | 0.0070 | 25 |
| HappyOyster Adventure | `reactor/happy-oyster-adventure` | Permanent worlds from a prompt (no image needed, image optional); `interact` verbs; **2-minute travel cap** | Good for rooms that must be identical on every visit (persistent `encrypted_world_id`). Cap of 2 min per travel is a real constraint for exploring | 0.0139 | 50 |
| HappyOyster Directing | `reactor/happy-oyster-director` | Same worlds, steered by text instructions; pause, resume, rewind; 3-minute cap | Bedtime "drift" mode: the story pushes instructions, the child watches. Rewind is a lovely bedtime affordance | 0.0139 | 50 |
| Helios | `reactor/helios` | Image-to-video, chunked, prompt scheduling | Cheap ambient video: the view through a lift window as floors slide past during transit | 0.0017 | 6 |
| Visko Orbis Stable | `reactor/visko-orbis-stable` | Per-chunk prompts morph the scene without cutting | Transit morphs (the lift "passing" three floors before the doors open) | 0.0097 | 35 |
| LTX | `reactor/ltx2` | Photo + script → lip-synced talking take with joint audio, up to 300 s | Quest-giving Oompa-Loompa at the doorway. Expensive live, so pre-render fixed lines and cache MP4s in R2, exactly like the UNA audio library | 0.0300 | 108 |
| X2 / SANA-Streaming | `xmax/x2`, `reactor/sana-streaming` | Live webcam restyle | The "come back to reality" loop in the addendum (your camera feed restyled into the world's register) | 0.0017 | 6 |

Recommendation: **LingBot World 2 for floors**, HappyOyster Directing as an experiment for a true bedtime mode, Helios for transit ambience if you want it (I would not, hum and dark is the register you chose), LTX pre-rendered for companions and errand-givers.

## 4. UNA becomes the prompt compiler

The LingBot prompt guide describes a production prompt as *layers recomposed on every input change*:

```
prompt = base + camera[isMoving] + movement[isMoving] + heldEvents + vertical
```

Budget: encoder truncates around 2000 characters. Base ≤ 600, each camera variant ≤ 300, each movement variant ≤ 350, each event ≤ 500. Trim events first; base and camera contract never fall off the tail.

That is a fragment library with selection logic. It is UNA. Add a `world` block to each room record:

```json
{
  "roomId": "marshmallow",
  "world": {
    "model": "reactor/lingbot-world-2",
    "seedImages": {
      "default": "r2://una-worlds/marshmallow/door-view-a.jpg",
      "flooded": "r2://una-worlds/marshmallow/door-view-flooded.jpg"
    },
    "seed": { "strategy": "rideHash" },
    "layers": {
      "base": "A vast pink kitchen hall of copper marshmallow vats seen from a brass doorway. The world contains EXACTLY ONE enormous central copper vat at a fixed position AND EXACTLY ONE sugar-dusted iron gantry running left to right at a fixed position AND EXACTLY ONE tiny green-haired worker in white overalls standing on the gantry at a fixed position. Warm caramel light, pink steam, glossy marshmallow surfaces. Storybook watercolour, soft edges.",
      "camera": {
        "static": "First-person view from the doorway, the central copper vat locked at the exact centre of the frame at constant size and distance. Neither the vat nor the camera moves on its own; look-input is the only source of camera motion, arcing the camera around the stationary, centred vat only while held.",
        "dynamic": "Strict first-person view, the central copper vat holding steady at the centre of the frame as the viewpoint advances through the hall; look-input becomes the heading changing."
      },
      "movement": {
        "static": "The marshmallow in the vat rises and settles slowly, a single bubble swelling and popping, pink steam curling up past the gantry, the worker leaning on a long wooden paddle.",
        "dynamic": "The viewpoint advances along the sugar-dusted floor toward the vat, footsteps leaving prints in the sugar, steam drifting past on either side."
      },
      "events": {
        "temptation": "The worker on the gantry lowers a single glossy marshmallow on a hook toward the viewpoint, holding it steady in the air.",
        "confessed": "The worker on the gantry folds its arms and shakes its head slowly, the paddle resting against the rail.",
        "denied": "The worker on the gantry points the wooden paddle directly toward the viewpoint and holds it there."
      }
    },
    "beats": [
      { "at": "arrivalNarrationEnd", "event": "temptation", "holdMs": 8000 },
      { "when": "state.marshmallow.ate && state.marshmallow.confessed", "event": "confessed", "holdMs": 6000 },
      { "when": "state.marshmallow.ate && !state.marshmallow.confessed", "event": "denied", "holdMs": 6000 }
    ],
    "budgetSec": 90
  }
}
```

Rules from the guide that UNA's linter should enforce (you already lint catalogues in `una.js`):

- Base has no motion verbs, no point of view, no input language. Two to four landmarks pinned with "EXACTLY ONE … at a fixed position".
- Never describe absence. "No adults" places adults. Say what is present.
- Camera templates copied verbatim, only the bracketed subject swapped. Paraphrase reads as a different instruction on current weights.
- Events use definite reference ("the worker"), never re-introduce the subject, end in a settled state.
- Seed image derived from base + camera.static + movement.static, rendered 16:9 (1664×960). If the image and the base disagree, regenerate the image, not the prose.
- Intent words ("make sure", "correctly") do nothing.

Variation, deterministically: same rider state + same seed → same world. UNA already hashes a ride; hash it into `set_seed`. Different carry state → different events held on arrival, different seed image variant, different prompt. "Entirely different each time" is delivered while staying a director, not a slot machine.

## 5. Session choreography: the ride as SDK calls

Connection lifecycle: `disconnected → connecting → waiting → ready`. Waiting is the GPU being assigned, "typically a few seconds". LingBot then begins in `WAITING`; `start` needs both image and prompt; the model spends its first several seconds materialising and drops input during that window.

```
 RIDE                              CLIENT / SDK                                   BILLING
 ─────────────────────────────────────────────────────────────────────────────────────────
 app opens, lift drawn             nothing                                        0
 child presses button 14           UNA resolves floor → manifest                  0
                                   reactor.connect(jwt)  [connecting → waiting]   starts
 doors close, hum, narration       on ready: uploadFile(seed) → setImage          running
   (~20–40 s authored audio)        → await image_accepted → setPrompt(idle)
                                    → start → await first chunk_complete
 narration ends                    if firstFrame: doors open onto the seed still  running
                                   else: stall gag line, retry every 4 s
 doors open, still → live          swap doorway texture to VideoTexture           running
 explore (≤ 90 s)                  beats → setPrompt(compose(...held events))     running
                                   Drift mode: setCameraPose(slow dolly)
 child taps "back to the lift"     doors close; reset() (same session)            running
                                     or disconnect(true) (30 s window)             running
                                     or disconnect() (terminate)                  stops
 next button                       reset → setImage → setPrompt → start           running
 UP AND OUT                        requestClip(20) → keepsake MP4; disconnect()   stops
```

Two session strategies. Pick per product tier.

**A. One session per ride, re-staged per floor.** Connect on the first press, `reset()` between floors, never pay GPU assignment twice. Idle billing during each transit (30 s × $0.007 ≈ $0.21). Smoothest.

**B. One session per floor.** `disconnect()` on re-entering the lift, `connect()` on the next press. GPU assignment latency is covered by the narration anyway. Cheaper. Riskier on the 10-sessions-per-minute account limit if many rides run at once (burst of 3, then one every 6 s).

Use A for the demo and the pitch. Use B, or A with `disconnect(true)`, once there are real users.

### The React shape (typed SDK)

```tsx
// App.tsx
import { LingbotWorld2Provider } from "@reactor-models/lingbot-world-2";
import { fetchToken } from "./token";        // memoised /api/token resolver, see tutorial pattern

export default function App() {
  return (
    // No autoConnect. The button press is the connect gesture; it also unlocks audio.
    // jwtToken accepts a resolver function as well as a string (JwtSource).
    <LingbotWorld2Provider jwtToken={fetchToken}>
      <Ride />
    </LingbotWorld2Provider>
  );
}
```

```tsx
// useFloorSession.ts, the orchestration hook
import { useRef, useCallback } from "react";
import {
  useLingbotWorld2, useLingbotWorld2ImageAccepted,
  useLingbotWorld2ChunkComplete, useLingbotWorld2CommandError,
} from "@reactor-models/lingbot-world-2";
import { composePrompt } from "./una/compose";

export function useFloorSession(onFirstFrame: () => void) {
  const lw = useLingbotWorld2();
  const imageOk = useRef<() => void>();
  const firstChunk = useRef<() => void>();
  const scene = useRef<FloorManifest | null>(null);
  const held = useRef<string[]>([]);
  const lastSent = useRef("");

  useLingbotWorld2ImageAccepted(() => imageOk.current?.());
  useLingbotWorld2ChunkComplete((m) => {
    if (m.chunk_index === 0) firstChunk.current?.();   // typed hooks pass the flattened message
  });
  useLingbotWorld2CommandError((e) => console.warn(e.command, e.reason));

  const send = useCallback(() => {
    if (!scene.current) return;
    const p = composePrompt(scene.current, isMoving(), held.current).trim();
    if (p && p !== lastSent.current) { lastSent.current = p; lw.setPrompt({ prompt: p }); }
  }, [lw]);

  const stageFloor = useCallback(async (m: FloorManifest, seedFile: Blob) => {
    scene.current = m; held.current = []; lastSent.current = "";
    if (lw.status === "disconnected") await lw.connect();       // strategy A: first press only
    else { await lw.reset(); await wait(600); }                  // subsequent floors
    const accepted = new Promise<void>((r) => (imageOk.current = r));
    const ref = await lw.uploadFile(seedFile, { name: `${m.roomId}.jpg` });
    await lw.setImage({ image: ref });
    await accepted;
    await lw.setSeed({ seed: m.seed });
    send();                                                      // idle composition
    const first = new Promise<void>((r) => (firstChunk.current = r));
    await lw.start();
    await first;                                                 // seed still → live from here
    onFirstFrame();
  }, [lw, send]);

  const hold = (ev: string, ms: number) => {
    held.current = [...held.current, ev]; send();
    setTimeout(() => { held.current = held.current.filter((h) => h !== ev); send(); }, ms);
  };

  return { stageFloor, hold, lw };
}
```

```tsx
// Doorway.tsx, the seam
const track = useLingbotWorld2Track("main_video");   // raw MediaStreamTrack, undefined until it arrives
useEffect(() => {
  if (!track) return;
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  video.play();
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  doorwayMesh.material.map = tex;          // replaces the seed-still texture
  doorwayMesh.material.needsUpdate = true;
}, [track]);
```

The base `Reactor` class gives the same thing outside React: `reactor.on("trackReceived", (name, track, stream) => …)`. The provider auto-disconnects on unmount, so keep `LingbotWorld2Provider` mounted for the whole ride (the same "keep one instance mounted" lesson you learned with ChromaKeyVideo).

## 6. Elastic transit: the lift as loader

Minimum transit = the authored narration. Maximum = narration + stall lines. Your dud-button gag lines are the perfect stall material ("the lift pauses to think about nougat"). Concretely:

- On press: start `stageFloor()` and the narration in parallel.
- `readyToOpen = narrationEnded && firstChunkSeen`.
- If narration ends first, play a stall line every 4 s (UNA already has a pool). Show subtle hum modulation.
- Hard timeout at 45 s: open the doors onto the seed still anyway and, if the stream never arrives, fall back to a pre-rendered 20 s clip of that room (record one per room during authoring with `requestClip`). The ride never breaks; it degrades to the audiobook.
- Time-to-first-frame budget to expect: a few seconds waiting + upload (~1 s) + start + several seconds materialising. Call it 8–20 s. Your Marshmallow arrival narration is ~40 s. Comfortable.

Recoverable disconnects: if the network drops mid-floor, the session lives 30 s on the GPU. `reconnect()` inside that window resumes with server-side state intact. Bill continues through the window.

## 7. Input for a bedtime register

Explore mode (older children, demos, the pitch): on-screen joystick → `setMoveLongitudinal` / `setMoveLateral`, drag-look → `setLookHorizontal` / `setLookVertical`. Every press needs a matching release to `"idle"`; movement is persistent state, and a tap released before the chunk boundary may never land. Debounce taps into 400 ms minimum holds.

Drift mode (bedtime): no joystick. `set_camera_pose` with a gentle constant forward and a slow yaw, paired with a one-sentence prompt hint in the prompt's own vocabulary ("the viewpoint drifts slowly forward while the vat stays centred"). Rotation ≤ 0.05 rad per frame; translation magnitude is normalised away, so shape motion by duration not size. Taps on the screen hold an event for a few seconds. The story's beats drive `setPrompt`. This is closer to what you approved for the audiobook: watching, not playing.

HappyOyster Directing is the other honest answer for Drift: `instruct("A single marshmallow lowers on a hook")` at each beat, `pause()` for the tap-to-eat choice, `rewind(8)` for "again". 3-minute cap per travel, 50 $/hr. Worth one afternoon of testing against LingBot before choosing.

Keep floors short. The guide is explicit: long holds drift, short presses with a settled world between them stay clean. Three rooms of ≤ 90 s each is already the right shape.

## 8. Cost and quotas, stated plainly

- A ride with three 90 s floors and ~30 s transits on strategy A ≈ 6 min × $0.42/min ≈ **$2.50 per ride** on LingBot World 2. Strategy B ≈ $1.90.
- UNA's audiobook costs ~$0.02 per personalised story. The live-world version is 100× that. It is a premium tier, a demo, a pitch centrepiece, or an event install. It is not the bedtime baseline. Say this in any deck before someone else does.
- Account defaults: **5 concurrent sessions**, **10 sessions per minute** (burst 3, refill one per ~6 s). Sessions in `connecting` or `waiting` count. Raise via support before any showing with more than a handful of devices.
- Tokens: session-scoped, 1 h default, 6 h ceiling, `max_sessions` counts sessions ever created (default 5, up to 500). Mint per ride on your server, scope to `reactor/lingbot-world-2`, set `max_session_duration_seconds` to ~900 as a cost fuse.
- Moderation screens prompts and seed images; violations terminate the session. Children's confectionery is safe, but "the worker" phrasing exists partly so nothing trips a hate or violence filter by accident.

## 9. Risks and caveats

- **Legibility.** World models will not render tiny button labels or readable signage. Anything that must be read lives in the lift or in UI, never in the stream.
- **Drift.** Identity morphs on long holds. Mitigation: short floors, `set_kv_cache_reset` left on `auto`, `trigger_kv_cache_reset` on each held event that changes the scene.
- **Image wins.** A seed image that shows two vats will produce two vats whatever the base says. The seed image pipeline is now part of authoring QA, one room at a time, same as writing.
- **Mobile.** WebRTC video must be muted and started after a user gesture. The button press is the gesture. iOS Safari needs `playsInline`. 48 fps at 1664×960 is a lot of bandwidth on a phone; the SDK reports RTT and FPS via `useStats()`; drop to Drift mode when it degrades.
- **Continuity across floors.** The model has no memory between floors. Carry-over is UNA's job (state → events), never the model's.
- **IP.** The demo must run on original rooms before anyone outside sees it. The demo I built uses original floor names for that reason.
- **Model churn.** Reactor's catalogue changes monthly and slugs are per-model. Take slugs from `/model-api-reference/overview` at build time, never from memory.

## 10. Build plan

1. **Today (done):** standalone three.js lift demo with a mock world and a live LingBot hook. Open `up-and-out-lift-demo.html`.
2. **Next session:** run `npx create-reactor-app lift --model=lingbot-world-2`, drop in the `Ride`, `Lift`, `Doorway` and `useFloorSession` pieces from `up-and-out-react/`, point `getJwt` at the scaffold's token route.
3. **UNA:** add the `world` block to the room schema; teach `una.js` to lint it against the layer rules; add a `/floor/:rideId/:buttonId` endpoint returning the manifest; batch-generate seed images per room variant into R2.
4. **Authoring:** one room's seed image and layers, tested live, before doing a second. Same discipline as the writing.
5. **Product decision:** Explore vs Drift as the default, after one afternoon on both, with a child watching.
6. **Keepsake:** `requestClip(20)` at UP AND OUT, stored with the ride's coda. Cheap, shareable, and it is the artefact you show people.

## Appendix A. Verified SDK facts (12 Sep 2026)

- Base class `Reactor` from `@reactor-team/js-sdk`; typed classes extend it. `LingbotWorld2Model`, `LingbotWorld2Provider`, `useLingbotWorld2()`, `useLingbotWorld2State()`, `useLingbotWorld2ImageAccepted()`, `useLingbotWorld2ChunkComplete()`, `useLingbotWorld2CommandError()`, `<LingbotWorld2MainVideoView />`, `useLingbotWorld2Track(name)`.
- Provider props (verified in the installed 3.0.2 types): `jwtToken?: JwtSource` where `JwtSource = string | (() => string | Promise<string>)`, so pass the memoised resolver straight in; `connectOptions: { autoConnect, maxAttempts, autoResumeTracks, sessionId, connectionId }`; `modelTracks` is pre-set by the typed provider. Does not connect on mount unless `autoConnect: true`. The cookbook's Next.js example names its prop `getJwt`; check whichever version `create-reactor-app` gives you.
- Typed hooks hand you the flattened message (`m.chunk_index`, `m.width`), whereas the base `reactor.on("message")` payload is `{ type, data }`. The typed command methods resolve with the model's reply, so `await lw.setImage(...)` returns the `image_accepted` message; the hook in `up-and-out-react/` awaits the event as well, belt and braces.
- `up-and-out-react/` typechecks and bundles against `@reactor-models/lingbot-world-2` 1.0.1 + `@reactor-team/js-sdk` 3.0.2 + three 0.160 (checked today).
- Store: `status`, `lastError`, `tracks`, `sessionId`, `connect`, `disconnect(recoverable?)`, `reconnect`, `sendCommand`, `uploadFile`, `publish`, `unpublish`, `pauseTrack`, `resumeTrack`. `useStats()` gives RTT and FPS every 2 s.
- LingBot World 2 commands: `set_prompt`, `set_image` (FileRef; ignored during generation, requires `reset` first), `set_seed`, `set_move_longitudinal` (idle/forward/back), `set_move_lateral` (idle/strafe_left/strafe_right), `set_look_horizontal`, `set_look_vertical`, `set_rotation_speed_deg` (0–30, default 5), `set_camera_pose` (6×k floats, y-down, bias not rig), `set_attn_window`, `set_kv_cache_reset`, `trigger_kv_cache_reset`, `start`, `pause`, `resume`, `reset`.
- LingBot World 2 events: `prompt_accepted`, `image_accepted`, `conditions_ready`, `generation_started`, `chunk_complete` (`chunk_index`, `active_action`, `active_prompt`, `frames_emitted`), `generation_paused/resumed/complete/reset`, `command_error`, `state` (authoritative snapshot). Chunk = 3 latent frames ≈ 12 pixel frames. Runs auto-restart with the same conditions until `reset`.
- Sessions: independent of the connection; multiple clients can adopt one via `connect(jwt, { sessionId })` (parent phone + child tablet watching the same floor). Creator owns the lifecycle. `disconnect(true)` keeps it alive 30 s. Billing from creation to termination.
- Recordings: `requestClip(seconds)` captures the last N seconds → `Clip` → `<ClipPlayer>` / `<ClipDownloadButton>` → MP4. Needs `hls.js` outside Safari.
- Auth: `POST https://api.reactor.inc/tokens` with header `Reactor-API-Key: rk_…` and `authorization_details: [{ type: "session", resources: { models: { match: ["reactor/lingbot-world-2"] } }, constraints: { max_sessions, max_session_duration_seconds } }]` → `{ jwt, expires_at }`.
- Scaffold: `npx create-reactor-app my-app --model=lingbot-world-2` (Next.js App Router, token route at `app/api/token/route.ts`). Reference apps: `github.com/reactor-team/reactor-cookbook/examples/api-models-examples/`.
- Docs: append `.md` to any docs URL; MCP server at `https://docs.reactor.inc/mcp` for in-editor search.
