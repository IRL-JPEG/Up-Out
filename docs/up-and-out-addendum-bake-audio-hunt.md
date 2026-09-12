# Up and Out addendum: baking rooms, spatial audio, and the whisper hunt

*12 September 2026. Follows on from `up-and-out-on-reactor.md`. Checked against World Labs docs (Marble export, Spark 2.x) and ElevenLabs Agents SDK 1.x.*

## A. Can we bake a room and reuse it?

Yes, but not on Reactor. Reactor regenerates on every session: that is what "world model" means there, and it is what the per-second pricing is for. HappyOyster's "permanent worlds" persist an identity (`encrypted_world_id`, `attachWorld()`), so the same room comes back looking the same, but each visit is still a live GPU stream, capped at two minutes of Adventure travel, billed per second. Consistency, not reuse.

Baking means turning the room into a 3D asset once and rendering it locally forever. The asset is a **3D Gaussian splat** (a cloud of semi-transparent particles), and the tooling has matured enough this year to make it the obvious move:

- **World Labs Marble** generates a full 3D world from text, an image, a video, or a coarse layout, and exports it as a Gaussian splat (.spz, .ply), plus a low-poly **collider mesh** for physics and a high-quality mesh for other tools. There is a **World API** (since January) for programmatic generation, so UNA can request rooms in a batch. Marble can also render a world to video with pixel-accurate camera control. Pricing: splat export needs the $20/month tier, commercial rights the $35 tier.
- **Spark** is World Labs' MIT renderer for three.js. It fuses splats with ordinary meshes with correct sorting, runs on iOS and Android (WebGL2), does real-time splat recolouring and relighting through a shader graph, and Spark 2.0 (April) streams large worlds with level of detail via a `.rad` format. npm `@sparkjsdev/spark` is pinned at 2.1.0; the jsDelivr build is ahead of it.
- Open alternatives if you want to own the generator: Tencent's HunyuanWorld exports meshes and splats; or record a Reactor clip and reconstruct with COLMAP + gsplat. The second is fragile because a world model has no ground-truth camera, so pose recovery fails on drift. Use Marble.

### The baking pipeline

```
UNA room record (base layer, landmarks pinned)
      │
      ▼
seed image: the view from the lift doorway, 16:9 (nano banana)
      │
      ▼
Marble image-to-world  ──►  room.spz  +  collider.glb  ──►  R2
      │                                                       │
      ├──► render "doorway camera" to a still ──► LingBot seed image (live tier)
      │
      ▼
Spark SplatMesh in the same three.js scene as the lift
```

The lift stops being a box with a video plane behind it and becomes a box **standing inside the room**. Open the doors and walk out. One scene, one renderer, no seam. The collider mesh keeps the rider inside the walkable volume. In the live tier the doorway plane still carries the Reactor video, and the seed image for that stream is a render of the baked room from the exact doorway camera, so both tiers share one geography.

Marble also takes **video as input**, which closes the loop the other way: when LingBot improvises a floor you love, `requestClip()` it, hand the clip to Marble, and bake what the model invented.

### What "different each time" means once a room is baked

Variation moves out of the renderer and back into UNA, which is where it belongs for the bedtime baseline:

- lighting and time of day: Spark relights and recolours splats live;
- props and characters as glTF meshes placed in splat coordinates, chosen by carry state;
- which errand-giver is present, which door is open, what the room says;
- sound, which is section B.

The live tier stays the premium option for rooms that should genuinely never repeat. The baked tier costs nothing per ride, which puts the audiobook economics ($0.02) back within reach.

### Limits to plan around

- Splats are static. Steam, bubbles and marshmallow are particles or Spark shader-graph animation on the splat, not baked motion.
- Legible text is a mesh you place, never something you ask the generator for.
- File size: a room lands somewhere in the tens of MB as .spz; use `.rad` streaming for anything larger and preload the next floor during the lift ride, which is once again the loading screen.
- Relighting a splat is a tint and exposure move, not a raytrace. For the dark-to-lit reveal in section C, bake two states or lean on emissive meshes.

## B. Spatial audio inside the room

Once the room is 3D this is standard Web Audio. `PannerNode` with `panningModel: "HRTF"` gives binaural placement on headphones; three.js wraps it as `AudioListener` on the camera and `PositionalAudio` on any object. Set `refDistance`, `rolloffFactor` and `maxDistance` for the falloff, add a `ConvolverNode` with a short impulse for the room's own reverb, and the sound sits in the splat.

The trick is that there are two listeners, and only one line of code differs:

| | Listener pose | Source positions |
|---|---|---|
| Virtual walk (on screen) | the three.js camera | splat coordinates |
| Real walk (headphones outside) | GPS fix + compass heading | geo-anchored, converted to metres from the start fix |

Write a `Listener` provider with two backends, `CameraPose` and `WorldPose`, feeding the same `AudioListener`. Everything downstream (panners, distance curves, the whisper pool) is shared.

Head tracking on the web is phone-only: `deviceorientationabsolute` on Android, `webkitCompassHeading` on iOS after `DeviceOrientationEvent.requestPermission()` from a tap. AirPods head tracking is native-only (`CMHeadphoneMotionManager`), not exposed to Safari. So the sound field turns with the phone, not the head. Tell people to hold the phone like a compass, or hang it on a lanyard, and it reads fine for a hunt.

Can you get a 3D space *from* the Reactor video directly? Not reliably; that is the section A answer (bake it through Marble). For a live room, fake it: pan by the bearing between the target and the camera heading you already track from your own look input, and let distance be narrative rather than geometric.

## C. The whisper hunt

Your concept, restated as a system. The lift is pitched up on site; the person puts on headphones; a voice whispers from somewhere nearby; they walk to it, it gets louder; when they find it they can talk to it; it asks for a light bulb; they walk back to the lift, get their task, find a bulb, photograph it in their hand, and the lights come on in the room with a sign inside.

### Sequence

```
 1 onboarding at the lift screen
     one tap on the first button grants: geolocation, motion (compass), mic, camera, wake lock
     start fix = the lift's position (this is also the return geofence)
 2 anchor placement
     target = start fix + bearing θ × distance d (60–150 m), chosen to be walkable if the site is known,
     random otherwise. "Indifferent to where they are" is exactly this: anchors are relative, never absolute
 3 the whisper
     PannerNode at the target, listener = smoothed GPS + heading
     gain and lowpass cutoff both driven by distance; a UNA whisper pool with warmer/colder lines every ~20 s
 4 arrival (within 12 m for 3 s)
     ElevenLabs agent session starts, routed through the same panner so the voice stays in place
     agent persona + first line from UNA; client tool give_quest({ item: "light bulb" }) advances the state machine
 5 return
     the anchor flips: the lift's hum now whispers from the start fix; 10 m geofence at the screen
     the pitched-up screen (a second client polling the Do Me A Favor server) reacts when the phone arrives
 6 the fetch
     True Action gates, in order: frame 1 → just-in-time instruction ("turn the screw thread to the camera")
     → frame 2 → LightGlue same-object check → JoyCaption / Claude grading ("a light bulb held in a hand")
     → geo-verify within the site radius → character reward line (ElevenLabs v3, Do Me A Favor voice.js)
 7 lights on
     baked room: Spark relight dark → lit, emissive signage mesh fades up (legible because it is a mesh)
     live room: setPrompt to the lit variant + trigger_kv_cache_reset, sign as a mesh over the doorway plane
     spatial audio: ambience swells, the character now speaks from inside the room
```

### The pieces and what already exists

| Piece | Build with | You already have |
|---|---|---|
| Position | `navigator.geolocation.watchPosition({ enableHighAccuracy: true })`, EMA smoothing, max-jump filter | Bristol Starter Pack PWA plumbing |
| Heading | device orientation, permission on tap | gyro work in Starter Pack AR |
| Whisper | `PannerNode` HRTF + `BiquadFilter` lowpass; gain 0 → 1 and cutoff 400 Hz → 8 kHz across 150 m → 10 m | UNA audio library convention on R2 |
| Talk | `@elevenlabs/client` `Conversation.startSession({ agentId, clientTools })`, WebRTC | ElevenLabs v3 voice IDs, grading prompts with audio tags |
| Quest state | Do Me A Favor server (SQLite), phone posts, screen polls | the two-server architecture with ngrok testing |
| Proof photo | True Action pipeline (LightGlue, JoyCaption, geo, JIT) | grew out of exactly this anti-cheat |
| Reveal | Spark relight + three.js emissive sign; or LingBot prompt swap | the doorway seam from the study doc |

### Numbers that matter

- Phone GPS is 3 to 10 m outdoors and much worse between buildings or indoors. Arrival radius 12 m with a dwell timer, a warmer/colder verbal layer so jitter does not feel like a lie, and a hard reveal after ~8 minutes so nobody is stranded.
- Keep encounters under 90 seconds. Agent minutes are billed, and attention outdoors is short. The first line is scripted; the agent only has to improvise the middle.
- Bluetooth gotcha: the moment the mic opens on Bluetooth headphones, iOS and Android drop to the hands-free profile (mono, 8 to 16 kHz), so the whisper turns to mush mid-conversation. Wired headphones for the pitch-up, or open the mic only during the encounter and accept the dip; audio routing is not selectable from Safari.
- iOS Safari has an open bug with the ElevenLabs *React* provider (state never updates, client tools do not fire). Call `Conversation.startSession()` from `@elevenlabs/client` directly; it works on the same device.
- Screen must stay awake for GPS on iOS web; `navigator.wakeLock` plus a dimmed hunt screen.
- Privacy: store site-relative metres, never raw GPS traces.

### Why the lift is still the right centre of gravity

The hunt reuses the study doc's one structural idea: the lift is the deterministic, always-there thing, and everything else is a door out of it. On screen the door leads to a baked or live room. On site the door is the person's own steps, and the room is the space around them with a voice in it. The photo is how reality gets checked in at the lift, which is the same gesture as pressing a button. UNA runs both.

## Build order

1. Bake one room through Marble from a doorway seed image; drop the .spz into the demo behind the doors with Spark; walk out of the lift. One afternoon.
2. Add `PositionalAudio` sources in that room (the vat bubbles, the worker's paddle). Same afternoon.
3. Swap the listener to `WorldPose` and walk the whisper outdoors with wired headphones. One session, in the park.
4. Wire the agent encounter with `give_quest` as a blocking client tool. Half a day.
5. Point the fetch at the existing Do Me A Favor + True Action grading with a light-bulb rubric. Half a day.
6. The reveal: Spark relight plus an emissive sign. One evening.
