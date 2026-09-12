# Spatial audio build handoff

*For the engineers taking on the whisper hunt and the in-room sound. 12 September 2026.*

## What we are building

Two things, on one piece of code.

1. **In the room (on screen).** Sound sources placed inside a floor: the vat bubbling, a worker's paddle, a whisper from behind the shelves. The listener is the camera. When the room is a baked splat (see `up-and-out-addendum-bake-audio-hunt.md`) the positions are real metres; when it is a live world-model stream, they are narrative positions we place by hand.
2. **Outside (headphones, on foot).** A voice anchored some tens of metres from where the person started. They hear which way it is and how far, walk to it, and when they arrive they can talk to it. Then the anchor flips to the lift and guides them back.

Both use the same listener, the same panners, the same distance curves. Only the source of the listener's pose changes. That is the whole design, and the starter code already has that shape: `public/js/spatial.js`.

## Conventions (locked)

- Units are metres. `x` east, `y` up, `z` south of the start fix. Facing north looks down `-z`, which is Web Audio's default forward. `headingDeg` is a compass heading, 0 north, 90 east.
- Listener height 1.5 m. Sources at 1.5 m unless the fiction says otherwise.
- Every source is `node -> lowpass -> PannerNode(HRTF, inverse) -> gain -> destination`. The panner owns loudness by distance; **we** own muffling by distance (the lowpass) because the panner cannot.
- One `AudioContext`, created and resumed on the first tap. `Audio.unlock()` in `audio.js` already does this; `Spatial.attach(ctx)` must be called right after it.

## Module map

```
public/js/spatial.js
  Spatial.attach(ctx)                           bind to the one AudioContext
  Spatial.setPose({x, z, headingDeg})           the listener (called by a provider)
  Spatial.addSource(id, node, opts)             opts: x, z, refDistance, maxDistance, rolloff, lowpassNear, lowpassFar, gain
  Spatial.moveSource(id, x, z) / setGain / removeSource
  Spatial.distanceTo(id) / bearingTo(id)        for UI and for the warmer/colder lines
  Spatial.tick()                                updates lowpass per source from distance (call on pose change or ~4 Hz)
  Spatial.metresFrom(startFix, fix)             lat/lng -> metres, equirectangular (fine under 1 km)
  Spatial.anchorFrom(bearingDeg, distanceM)     place a target relative to the start fix
  Spatial.CameraPose(camera)                    provider: three.js camera -> pose, per frame
  Spatial.WorldPose(opts)                       provider: GPS + compass -> pose; arrival detection with dwell
```

The whisper currently in `audio.js` (a noise bed on its own panner that circles the listener) is a placeholder to prove headphones work. Task one is to move it onto `Spatial.addSource("whisper", …)` and delete the private panner.

## Distance curves (starting values, tune in the park)

| Parameter | Value | Why |
|---|---|---|
| `distanceModel` | `inverse` | natural falloff; `linear` felt like a volume knob |
| `refDistance` | 6 m | full volume inside this radius |
| `rolloffFactor` | 1.4 | slightly faster than physics, reads as "closer" sooner |
| `maxDistance` | 250 m | beyond this the panner stops attenuating; keep it above the longest anchor distance |
| lowpass near / far | 8 kHz at 0 m to 350 Hz at `maxDistance`, log interpolation | the whisper is a mumble at 150 m and words at 15 m |
| target anchor distance | 60 to 150 m | long enough to walk, short enough for GPS to matter |
| arrival radius / dwell | 12 m, 3 s | GPS jitter never fires an arrival by accident |

Loudness alone is a bad cue outdoors (traffic). Muffling plus the verbal warmer/colder layer is what people actually follow.

## The whisper source

Two layers on one panner:

1. **Bed.** A looped, filtered texture (breath, room tone) so the direction is always audible even between lines. Gain 0.25.
2. **Lines.** The UNA whisper pool (pre-rendered WAVs from R2, ElevenLabs in production; `speechSynthesis` is the placeholder). Play each line through the same panner by decoding to an `AudioBufferSourceNode` and connecting it as the `node` of a temporary source at the same position, or by routing a `MediaElementAudioSourceNode` from an `<audio>` element. Do not play lines on the main output; they must sit where the bed sits.
3. **Warmer / colder.** Every ~20 s compare `distanceTo("whisper")` with the value 20 s ago. Closer by more than 8 m → a "warmer" line; further → "colder"; otherwise silence. This is what makes GPS jitter feel intentional.

## Pose providers

### CameraPose (on screen)

Straightforward. Bind after the three.js scene exists. Heading is derived from the camera yaw. When the doorway is a world-model video rather than a splat, there is no camera in the room: fake the pose from our own look input (we know which way we last told the model to look) and keep the sources in front of the doorway.

### WorldPose (outside)

- `start()` **must** be called from a user gesture: it requests orientation and motion permission (iOS), starts `watchPosition({ enableHighAccuracy: true })`, and takes a screen wake lock.
- The **first fix is the start fix** and becomes (0, 0). Everything, including the lift's own position, is relative to it. That is why anchors are placed with `anchorFrom(bearing, distance)` and never with absolute coordinates: it works in any park.
- Smoothing: exponential (alpha 0.35) plus a jump filter (discard moves over 25 m when accuracy is worse than 20 m). Expect 3 to 10 m accuracy outdoors and do not promise better.
- Heading: `webkitCompassHeading` on iOS, `360 - alpha` from `deviceorientationabsolute` on Android. Compass needs a figure-of-eight once and drifts near cars and railings. Use it for the sound field only; never gate arrival on heading.
- Arrival: `watchArrival(id)`, then `onArrive(fn)`; re-arm with `rearm(id)` when the target flips to the lift.

## The hunt, as states

```
ARMED        anchor placed at anchorFrom(θ, d); whisper bed on; lines every ~20 s
NEAR         distanceTo < 25 m: lines every 8 s, bed gain up to 0.5
ARRIVED      dwell satisfied: whisper bed ducks to 0.1, agent session starts (see below)
QUEST_GIVEN  agent called the client tool; anchor moves to (0,0) = the lift; hum source added at the lift
RETURNED     arrival at the lift; hand over to the screen (the fetch quest is the camera flow already in app.js)
```

## Talking to the character

- `@elevenlabs/client`, `Conversation.startSession({ agentId, connectionType: "webrtc", clientTools: { give_quest } })`. Use the client directly rather than the React provider: the provider has an open iOS Safari bug where state never updates and client tools never fire.
- Mark `give_quest` as **blocking** in the agent config so the agent waits for our return value; return "quest accepted" and advance the state machine from it.
- Route the agent's output into the panner: the client exposes the output audio; take the `MediaStream` (or its element) into a `MediaStreamAudioSourceNode` and `addSource("agent", node, { x: whisper.x, z: whisper.z })`. If the SDK insists on playing to the default output, mute it and re-route; the voice must stay in place or the illusion breaks the moment they speak.
- Mic + Bluetooth: opening the mic switches Bluetooth headphones to the hands-free profile (mono, 8 to 16 kHz). Wired headphones for the pitch-up. Open the mic only for the encounter, close it after.
- Keep the encounter under 90 s. First line scripted by UNA; the agent improvises the middle; the tool call ends it.

## Bench test (no walking)

Add a debug panel (behind `?debug=1`) with sliders for `x`, `z`, `headingDeg` calling `Spatial.setPose` directly, and a readout of `distanceTo` / `bearingTo` for each source. Acceptance on the bench:

1. Rotating heading by 90 degrees moves the whisper cleanly from front to side in headphones.
2. Moving from 150 m to 10 m goes from mumble to words without a step.
3. A simulated fix jump of 40 m with accuracy 30 m is ignored; the same jump with accuracy 5 m is accepted.
4. Arrival fires only after 3 s inside 12 m and does not re-fire.

## Field test (one afternoon, a park)

Wired headphones, two phones (one iOS, one Android), a printed map. Log every fix (distance, accuracy, heading) to the console and export. Walk the anchor five times from different bearings. Record: time to arrival, false arrivals, how many warmer/colder lines it took, compass drift on the return. Tune `alpha`, `arrivalRadius`, the lowpass range, and the line cadence from that log, then lock them.

## Out of scope for this handoff

Head tracking from AirPods (native only), real 6DoF in the room (WebXR on Android, ARKit shell on iOS; see `up-and-out-phone-motion-controls.md`), and reverb per room (a `ConvolverNode` per floor is a small follow-up once the rooms are baked).
