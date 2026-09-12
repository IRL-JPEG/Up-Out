# Up and Out

A 9:16 glass-elevator adventure with 45 illustrated rooms, 45 named factory workers, one movement instruction per visit, and a real-world favour. The request ends on a held frame and crossfades into the camera. After an offering, the character replies with a fresh rhyming verdict, the grade lands on the visitor's photo, and successful offerings unlock a spoken keepsake.

Artwork is being delivered in batches. All 45 room packages are implemented; rooms with an incomplete image pair are marked in the directory and cannot be entered yet. The latest pushed batch is listed in `docs/image-progress.json`.

## Run

```powershell
npm install
Copy-Item .env.example .env # fresh checkout only; preserve an existing .env
npm start
```

A fresh checkout defaults to port 3000. The current local demo uses http://localhost:3100. Browser providers and Reactor WASM are bundled locally by `npm run build`, which also runs before start/dev.

The experience drawer has three modes:

- **Live video:** Reactor animation, Anthropic offering checks and ElevenLabs speech.
- **Illustrated + real quests:** the room illustrations move gently; checks, rhyming replies and ElevenLabs recordings are real. This is useful for testing a complete favour without generating video.
- **Practice preview:** illustrated rehearsal, explicitly simulated grades and browser speech. `npm run dev` forces this mode with `MOCK_AI=1`.

`DEMO_MODE=1` also adds an explicit photo skip. It cannot award a checked keepsake or conversation session.

## Room content and images

The 38 canonical rooms follow the supplied four walls (10, 10, 9, 9), followed by seven legend rooms. The directory supports wall filters and search. Existing lift-panel hotspots map to canonical room IDs.

- `docs/room-requests.json` and `docs/room-image-prompts.md` preserve the supplied source content.
- `public/js/rooms-data.js` exposes the room requests to the browser; `public/js/floors.js` adds the authored tour, movement, encounter and return plans.
- `public/assets/rooms/{id}-arrival.png` shows each busy room from halfway inside the glass lift. `{id}-encounter.png` shows its worker closer to the viewer, at another angle in that room.
- The images use the supplied scratchy ink and loose watercolour reference, preserved in `docs/visual-reference.webp`. Each room has its own layout, objects, cast and activity. The mobile viewport is exactly 9:16; source images are validated within a small aspect-ratio tolerance.
- `docs/room-image-prompts.json` contains the full 90 generation prompts; batch manifests record generated files. Images are produced with the built-in image tool and saved inside this checkout.
- `/floor-guide.html` is the browsable authoring guide with both reference images, the full request, shared and room-specific rubrics, voice samples and video prompts. `npm run build` regenerates it and `docs/floor-manifest.json`.

The previous live-action images and old LingBot documents remain historical assets; the current app uses the new room manifest.

## Grading and the verdict

`server/providers.js` assembles the supplied shared grading prompt plus the selected room's own grading block. The server accepts either a photo or a typed offering, never a browser-supplied rubric. Images are inspected with Anthropic. A real, suitable find may earn A* without a hand in frame; a typed offering caps at A. Screens, catalogue images and uncertain evidence cap at C. Grades are A*, A, B, C, D and F. A single image cannot prove capture authenticity.

The model returns JSON containing `grade`, `headline`, `response`, `ttsResponse`, `flag`, `provenance`, `observedObject` and `visualDetails`. Every unflagged reply contains 30–55 spoken words ending in a new two-line rhyming verdict, in that room's character. The application validates the shape, word count, evidence limits and matching spoken words. Malformed responses get one bounded format retry; provider outages do not become passing grades. Moderated content produces only a gentle request to find something else and is not described in a video prompt.

`server/response.js` constructs the next H3 scene using the current room, named worker, observed item, visible details, grade outcome and exact spoken reply. The raw visitor photo is not uploaded to Reactor. A/B/C/D/F reactions stay kind; only A*/A resolves a favour. The private-bar doorman keeps refusing entry at every grade, as specified in the source rules.

The camera closes, the character responds, and then the submitted photo or typed answer receives a grade stamp. The clean transcript preserves the closing couplet. Lower grades offer another attempt and a cached voice replay. A*/A unlocks a downloadable MP3 of that personalised reply. Reloads restore the verdict and the visitor's image from this tab's session storage; returning to the lift clears that image. Photos are processed in server memory and never written to server disk.

## Provider setup

Keep secrets in the ignored `.env`; never place them in browser code or commit them.

- `REACTOR_API_KEY` enables `reactor/h3-reference-to-video-turbo-realtime`.
- `ANTHROPIC_API_KEY` enables real offering checks. `ANTHROPIC_MODEL` defaults to `claude-sonnet-4-6`.
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` enable the selected character voice. The existing voice is the fallback for all named workers; optional room-specific voice assignments can override it.
- `ELEVENLABS_TTS_MODEL` defaults to `eleven_v3`. Two to four performance tags are retained only in its speech field; captions and older models use the clean transcript.
- `ELEVENLABS_AGENT_ID` optionally enables a microphone conversation after a checked successful offering. It is separate from the generated verdict and is not required to complete a favour.

The H3 player explicitly generates and plays each clip once, bootstraps `get_state`, sets `set_canvas` to `9:16`, and preserves the final frame. Speech starts when the character clip starts. Reactor's native audio is muted during the external voice; if the full supplied request or verdict is longer than the clip, the final frame holds until speech ends. This coordinates the words and video, but does not guarantee phoneme-level lip sync. Illustration mode plays the same full ElevenLabs recording over the corresponding image.

Reactor sessions use model-scoped, single-session tokens and close after the camera handoff, verdict or 45 seconds idle. The default session cap is 300 seconds, bounded at 900. Reviewing a saved verdict does not open a video session. Visit state belongs to an HTTP-only session and is held in one Node process for four hours. A restart ends unfinished visits; multi-process deployment requires a shared store. Phone camera access needs HTTPS or localhost.

An optional conversation agent should use the same voice and these dynamic variables:

```text
You are {{character_name}}, a kind, eccentric factory worker in {{floor_name}}.
{{quest_status}} The visitor offered {{quest_object}}.
Speak briefly and warmly in character. The favour is complete; do not ask for
personal details, more photos, or access beyond the room's story rules.
```

The microphone starts only after the visitor taps the conversation button. Exit, page hiding and a three-minute cap stop it. Conversation uses the held character image.

## Verification

```powershell
npm run check # strict: all 90 images must be present
node scripts/check.js --allow-pending-images # validate a partial artwork delivery
npm test
npm run test:browser
npm run test:browser:response
```

Unit and browser tests cover all room definitions, evidence caps, moderation, ownership, one-instruction progression, portrait layout, wall filters, camera cleanup, typed answers, grade stamps, reload and retry. Browser fixtures are explicitly simulated and do not claim provider proof.

Bounded live checks use the configured providers and incur their normal usage:

```powershell
$env:LIVE_QUEST_TEST='1'
node tests/live-quest.cjs
$env:LIVE_REACTOR_TEST='1'
node tests/live-reactor.cjs
```

The offering check verifies a real Anthropic illustration rejection and typed A, fresh couplets, constructed video prompts, actual ElevenLabs recordings, cached replay and a gated keepsake. The Reactor check exercises a complete illustrated-reference video visit through the camera and dynamic graded return. Local screenshots, event records and recordings are saved in ignored `artifacts/`; these checks do not deploy the app.
