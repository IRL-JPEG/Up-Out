# Up and Out

A portrait elevator adventure: eleven busy floors, one player instruction, Pip's request, a held final frame and a crossfade into the camera. The existing panel remains interactive; the floor picker provides larger touch targets.

## Run

```powershell
npm install
Copy-Item .env.example .env # only for a fresh checkout; keep an existing .env
npm start
```

The current local demo is running at http://localhost:3100. A fresh checkout defaults to port 3000. `npm run dev` uses the illustrated rehearsal with no live video charges. The experience drawer switches between live video and illustrated preview. Provider libraries and Reactor WASM are bundled locally by `npm run build`, also run before start/dev.

## Demo journey

Choose a floor, watch the introduction, enter one movement instruction, and watch Pip approach with the request. The app explicitly plays each H3 clip once. After the request finishes, it captures the last available video frame, terminates the Reactor session and fades in the camera with the floor-specific question. There is no return-to-elevator clip, looping or cut to black.

`DEMO_MODE=1` adds **demo: skip photo check**. This takes the story to Pip's return and a browser-spoken preview reward. The interface labels the skipped check. It cannot unlock a verified ElevenLabs reward or agent session. Switch it off for a real quest flow.

## Content

- `public/js/floors.js`: authoritative floor definitions, two portrait references per floor, introduction/movement/encounter/reunion prompts, spoken question, paired photo rubric and reward text.
- `public/assets/floors/mobile/`: the existing 22 floor images plus Pip's character reference. Arrival images retain the near elevator wall, door jamb and threshold. Encounter images show the same room and Pip from a second angle.
- `/floor-guide.html`: browse every image pair with the scripts and prompts. Regenerate it and `docs/floor-manifest.json` with `node scripts/floor-guide.js` after content edits.
- `public/js/journey.js`: mobile UI, locked sequence, camera, recovery and voice controls.
- `public/js/player.js`: illustrated and H3 players. H3 uses `get_state` to bootstrap its command snapshot, explicit generation/playback, `set_canvas` with `9:16`, and hold-last-frame mode. `continue_from_clip_id` supplies continuity within one connection; after a quest or idle timeout a new session uses the floor references again.
- `server/api.js`, `server/journeys.js`, `server/providers.js`: session ownership, progression, provider access and reward gates. Secrets never enter the browser.

The old LingBot planning documents and legacy app/world scripts are historical; the page now loads `player.js` and `journey.js`.

## Services

Reactor uses `REACTOR_API_KEY` and the fixed model `reactor/h3-reference-to-video-turbo-realtime`. A new connection gets a model-scoped token allowing one session. The default per-session limit is 300 seconds, capped at 900. Idle sessions close after 45 seconds. Initial generation and connection failures have visible retries; they never silently switch a live visit into a simulation.

Real photo checking requires `ANTHROPIC_API_KEY`. The server selects the floor rubric; the browser cannot provide its own task. Every readable photo result gets a character response scene. Only A/A* with apparent real-world provenance and a visible hand unlocks a reward; lower grades return to a retry button after the response. Wrong photos, malformed results and provider outages do not pass. Photos are processed in memory and are not written to disk. A single-image check is not proof of capture authenticity.

ElevenLabs speech requires `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. The same voice delivers the initial request and the photo-specific reply. Successful replies become downloadable MP3 keepsakes. `ELEVENLABS_TTS_MODEL` defaults to `eleven_v3`; its performance tags are kept out of captions and omitted for older models. Live conversation additionally requires `ELEVENLABS_AGENT_ID`. Configure the agent as Pip and include these dynamic variables in its dashboard prompt:

```text
You are {{character_name}}, a kind, eccentric factory guide in {{floor_name}}.
{{quest_status}} The visitor brought {{quest_object}}.
Thank them, answer briefly in character and talk about this room. Never ask for
personal details or more photos. The quest is already complete.
```

Set the agent's voice to the same voice as `ELEVENLABS_VOICE_ID`. The server issues a signed WebSocket URL only after a real photo pass and reunion. The microphone starts only when the visitor taps Talk to Pip; exit, page hiding and a three-minute cap stop the call. The video remains a held image during voice conversation; live lip synchronization is not implemented.

Visit state is held in this single Node process for four hours and can be resumed after a page reload. A server restart ends unfinished visits. Deploying multiple processes requires a shared session store. Real phone camera access requires HTTPS or localhost.

## Verification

```powershell
npm run check
npm test
npm run test:browser:response # isolated grading fixtures: fail, reload, retry, pass
npm run test:browser # running demo server on localhost:3100; installed Chrome
```

The browser check covers portrait layout, the full illustrated journey, actual browser camera acquisition with a test device, photo capture and track cleanup, gated rewards, page reload, a second floor and the explicit demo skip.

A bounded real Reactor check was completed against the supplied local key: tour, one translated instruction, encounter, `clip_finished`, frozen frame, session teardown and camera handoff. The server's 9:16 canvas emits 768x1344 video; the app presents it within a 9:16 viewport. Screenshots and lifecycle evidence are in the ignored `artifacts/` directory. Photo grading and ElevenLabs calls remain unverified without their respective credentials.

An optional billed repeat is available with `LIVE_REACTOR_TEST=1` and `node tests/live-reactor.cjs`. It runs only when explicitly enabled.

## Personalised photo response

`server/response.js` constructs the character dialogue and H3 prompt from the photo checker JSON: `grade`, `provenance`, `observedObject`, `visualDetails`, and `headline`. The server adds an authored `response`, a performed `ttsResponse`, a grade-dependent `rewardLabel`, and a unique result ID. A screen/catalogue or uncertain result cannot receive a passing grade. The raw photo is not retained or uploaded to Reactor; only the bounded visual observations are included as data alongside the existing room and character references.

After grading, the camera closes and Pip returns for every grade. `/api/speech` generates and caches the current reply using the configured character voice. The player starts it when the character clip begins, mutes Reactor's native audio and holds the final frame if the recording runs longer. This coordinates the dialogue and scene; it does not guarantee phoneme-level lip sync. The grade stamp lands after the response finishes. Unsuccessful attempts offer another photo and cannot unlock a keepsake or agent conversation. Reloads retain the result and its stamp for the lifetime of the server visit.

The Do Me a Favor reference informed the separate clean/performed transcripts, provenance checks, grade-dependent response and recording reuse. Missing voice setup is visibly labelled and captions remain usable; configured provider failures offer a retry rather than pretending speech succeeded. Illustrated preview grades and browser voices remain explicitly simulated.
