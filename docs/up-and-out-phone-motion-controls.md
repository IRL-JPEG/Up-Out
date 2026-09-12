# Driving a world model with the phone: motion controls report

*12 September 2026. For Up and Out on Reactor. Assumes LingBot World 2 (`reactor/lingbot-world-2`) as the primary model, with HappyOyster Adventure noted where it differs.*

## The idea in one line

The phone is the head. Where it points is where you look; a held thumb or your own feet is how you move. The world model gets a small stream of look and move commands, and the lift's rules about what those commands mean live in the prompt.

## 1. What the phone gives a web page

| Signal | API | iOS Safari | Android Chrome | Notes |
|---|---|---|---|---|
| Orientation (yaw, pitch, roll) | `deviceorientation` (`alpha`, `beta`, `gamma`) | after `DeviceOrientationEvent.requestPermission()` from a tap | yes | Relative on iOS; `deviceorientationabsolute` on Android gives a compass-referenced yaw |
| Compass heading | `webkitCompassHeading` (iOS), `alpha` with `absolute: true` (Android) | yes | yes | Needs a figure-of-eight calibration and drifts near metal |
| Angular velocity | `devicemotion.rotationRate` (deg/s) | after permission | yes | The cleanest signal for look: rate, not angle |
| Acceleration | `devicemotion.accelerationIncludingGravity` | after permission | yes | Step detection lives here |
| Position | `navigator.geolocation.watchPosition` | yes, foreground only | yes | 3 to 10 m outdoors, useless indoors |
| AR pose (6DoF) | WebXR `immersive-ar` | **no** | yes, Chrome with ARCore | The one big gap: iOS has no WebXR AR |
| Headphone motion | none on the web | native only (`CMHeadphoneMotionManager`) | none | Reactor's Swift SDK is the door to this |
| Screen awake | `navigator.wakeLock` | yes | yes | Required, or the sensors stop with the screen |

Practical conclusion: on the web, cross-platform means `devicemotion` + `deviceorientation` + geolocation. WebXR is Android-only for AR. Real 6DoF walking in a room is a native app (ARKit via the Reactor Swift SDK) or Android-only on the web. For Up and Out that is fine: the walking happens in the world model, not in the room.

## 2. What the model accepts

LingBot World 2 exposes two control layers, and they behave differently:

- **Held axes.** `set_look_horizontal` (left / right / idle), `set_look_vertical` (up / down / idle), `set_move_longitudinal` (forward / back / idle), `set_move_lateral` (strafe left / right / idle), and `set_rotation_speed_deg` (0 to 30, default 5, per latent frame). These are persistent state, applied at the next chunk boundary, and a value held for less than a chunk may never land on screen. A chunk is 3 latent frames, about 12 pixel frames, so at 48 fps the boundary comes every ~250 ms.
- **Camera pose.** `set_camera_pose` takes per-frame deltas `[rx, ry, rz, tx, ty, tz]` (radians and units, camera-local, y-down), either one delta for the whole chunk or one per latent frame. Rotation overrides the look axes while active; translation adds to the move axes. Rotation is not normalised (keep it under ~0.05 rad per frame); translation magnitude is normalised per chunk, so only direction and shape survive. The docs call this a bias, not a rig: the model has no ground-truth camera, so the deltas steer generation rather than move a camera.

HappyOyster Adventure is simpler and coarser: `look("Mouse_Left" | "Mouse_Right" | "Mouse_Up" | "Mouse_Down" | diagonals | "None")`, `move("Front" | … | "None")`, `interact(...)`, and a `hold({ translation, rotation, interaction })` combo. No pose layer, so phone motion has to be quantised to those eight directions.

## 3. Two mappings, pick by feel

### Mapping A: quantised look (held axes)

Turn the phone's yaw *rate* into left / right / idle with a dead zone and hysteresis, and let `set_rotation_speed_deg` carry how fast:

```
rate = rotationRate.alpha (deg/s), low-pass filtered
if |rate| < 12 deg/s          → look_horizontal = idle
elif rate > 0                 → look_horizontal = left,  rotation_speed_deg = clamp(|rate| / 8, 3, 20)
else                          → look_horizontal = right, rotation_speed_deg = clamp(|rate| / 8, 3, 20)
```

Send only when the value changes; the SDK's state snapshot is the truth. Pitch works the same on `rotationRate.beta` into `look_vertical`. This is robust, cheap, and it works identically on HappyOyster with the speed dropped. It feels like a joystick that you steer with your wrist. It does not feel like looking around.

### Mapping B: continuous look (camera pose)

Integrate the gyro over one chunk and send the result as a per-chunk pose delta:

```
every 250 ms (one chunk):
  ry = clamp(yawDeltaRad / 3,   -0.05, 0.05)     // per latent frame, 3 per chunk
  rx = clamp(pitchDeltaRad / 3, -0.03, 0.03)
  tz = holdingForward || stepping ? -1 : 0       // direction only, magnitude is normalised away
  set_camera_pose({ camera_pose: [rx, ry, 0, 0, 0, tz] })
on release / stillness:
  set_camera_pose({ camera_pose: [] })           // hand the camera back to the look axes
```

This is the one that feels like turning your head. Two rules from the prompt guide apply: pair a sustained move with a one-sentence prompt hint in the prompt's own vocabulary (for example "the viewpoint turns steadily while the tower stays at constant distance"), and strip the hint the moment the move ends so hints never stack. Short, input-driven flicks need no hint.

Recommendation: ship A first (an afternoon), then B behind a toggle and let the room decide. Drift mode for bedtime is B with tiny fixed values and no phone at all.

## 4. Moving forward: three sources

1. **Press and hold.** Thumb on the screen → `set_move_longitudinal: forward`; release → `idle`. Deterministic, works everywhere, and the lift's D-pad already does it. Default.
2. **Steps.** Peak-detect the vertical component of `accelerationIncludingGravity` (band-pass 1 to 3 Hz, threshold ~1.2 g, refractory 300 ms). Each step opens a 400 ms forward window; continuous walking becomes continuous forward. Works standing on the spot, which is exactly what a bedtime room or a pitched-up site needs. Phones in pockets read steps fine; phones held out in front read them a little worse.
3. **Real displacement.** GPS speed over ground above 0.6 m/s → forward. Outdoors only, laggy by two to three seconds, and only worth it for the whisper hunt where the person is genuinely walking. Do not use it inside.

Direction always comes from the phone's heading, never from the movement source. On LingBot the heading is *relative*: forward is where the camera already faces, and the phone's yaw changes that facing. So "phone direction creates which way you move" falls out for free once look is wired: turn the phone, then hold to walk.

## 5. Latency and comfort

- **Budget.** Gyro sample (~16 ms) + filter (30 to 60 ms) + command round trip (~50 to 100 ms) + chunk boundary (0 to 250 ms) + generation lead (a few hundred ms) + WebRTC playout. Expect 400 to 800 ms between turning the phone and seeing the turn. That is fine for steering and wrong for VR-style head-locking; the design should never promise the latter. Nobody wears this on their face.
- **Ratchet, do not chase.** Send at chunk cadence (4 Hz), not sensor cadence (60 Hz). Command spam does nothing between boundaries and burns the connection.
- **Dead zones and recentre.** A yaw dead zone of ~10 deg/s and a two-finger tap or a shake gesture to recentre. Compass drift means absolute heading is a suggestion; use relative yaw for look and only consult the compass for the whisper hunt.
- **Fresh worlds ignore input.** The first several seconds after `start` drop input while the scene materialises. Keep the phone controls disabled until the first stable chunks (the same `chunk_complete` gate that opens the doors).
- **Keep holds short.** Long continuous look drifts the world. Encourage glances, not pans: the prompt's idle variant should be interesting enough that nobody needs to sweep.
- **Motion sickness.** The picture moves with the phone but not with the head, and the picture is generated, not rendered, so it wobbles. Cap rotation speed at ~15 deg per latent frame, never invert axes, and offer the D-pad as an always-available alternative.

## 6. Where AR kits actually help

- **Android web:** WebXR `immersive-ar` gives a real 6DoF pose. Map camera-local translation between frames straight into `tx, ty, tz` of `set_camera_pose` (direction only survives) and rotation into `rx, ry`. Walking three steps forward in the room walks three steps in the model, roughly. Worth a prototype for the pitched-up site if the devices are Android.
- **iOS:** no WebXR AR. The path is a native shell (Capacitor or Swift) using ARKit for pose and the Reactor Swift SDK for the session (`async throws` API, BGRA frames, `sendCommand`), which also unlocks AirPods head tracking and background audio for the whisper hunt. That is the version of this that feels like magic, and it is a separate build.
- **Both:** the AR camera itself is the fetch quest's camera. One permission, one capture pipeline, True Action's checks on the frames.

## 7. Minimal implementation sketch (web, mapping A + hold to move)

```ts
// after a tap: permissions, then sensors
await DeviceOrientationEvent.requestPermission?.();
await DeviceMotionEvent.requestPermission?.();
const wake = await navigator.wakeLock?.request("screen");

let yawRate = 0, pitchRate = 0;
addEventListener("devicemotion", (e) => {
  const r = e.rotationRate ?? {}; // deg/s
  yawRate = 0.8 * yawRate + 0.2 * (r.alpha ?? 0);
  pitchRate = 0.8 * pitchRate + 0.2 * (r.beta ?? 0);
});

let lastH = "idle", lastV = "idle";
setInterval(() => {                       // chunk cadence
  const h = Math.abs(yawRate) < 12 ? "idle" : yawRate > 0 ? "left" : "right";
  const v = Math.abs(pitchRate) < 12 ? "idle" : pitchRate > 0 ? "up" : "down";
  if (h !== lastH) { lastH = h; lw.setLookHorizontal({ look_horizontal: h }); }
  if (v !== lastV) { lastV = v; lw.setLookVertical({ look_vertical: v }); }
  const speed = Math.min(20, Math.max(3, Math.max(Math.abs(yawRate), Math.abs(pitchRate)) / 8));
  if (h !== "idle" || v !== "idle") lw.setRotationSpeedDeg({ rotation_speed_deg: speed });
}, 250);

// hold anywhere to walk; steps can drive the same two calls
screen.onpointerdown = () => lw.setMoveLongitudinal({ move_longitudinal: "forward" });
screen.onpointerup   = () => lw.setMoveLongitudinal({ move_longitudinal: "idle" });
```

On iOS, `alpha` in `rotationRate` is yaw about the screen normal when the phone is held flat; when held upright like a viewfinder, yaw is closer to `beta`. Detect the holding posture from gravity (`accelerationIncludingGravity.z` vs `.y`) and swap axes, or just tell people how to hold it and calibrate once.

## 8. Build order

1. Mapping A with hold-to-move in the panel demo's live world. Half a day. Test on your phone with a real session.
2. Step detection as a second forward source, toggle in the drawer. Two hours.
3. Mapping B behind a toggle, with the prompt hint composed on and off. One day. Compare on the same room.
4. Drift mode: mapping B constants, no sensors, story beats only. One hour, and it is the bedtime default.
5. If the pitched-up site is Android: WebXR pose into the pose layer. Two days. If iOS: park it and put the native shell on the roadmap next to the AirPods whisper.
