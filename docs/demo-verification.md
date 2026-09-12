# Demo verification — 12 September 2026

The local demo has configured Reactor video, Anthropic offering checks and ElevenLabs character speech. Credentials stay in the ignored local `.env`; a fresh team checkout needs its own provider configuration.

## Automated checks

- All 90 reference images are present, decode successfully and meet the portrait aspect-ratio tolerance. Every room has a separate arrival and encounter image, with recorded generation prompts.
- All 27 unit tests pass, covering the 45 room packages, exact supplied requests and rubrics, one-instruction progression, ownership, evidence limits, retry behaviour, matching voice/video scripts and the 38-room lift hit map.
- The mobile browser journey passes: room directory and wall filters, search, portrait tour, full character request, camera handoff and cleanup, grade stamp, reload and explicit rehearsal skip.
- The response browser journey passes: failed photo with retry, successful photo with a stamped verdict, typed offering capped at A, matching constructed video prompt, playable voice response and cached keepsake. These browser checks use isolated provider fixtures.
- The illustrated lift browser journey passes: all 38 targets resolve from source-image coordinates to the correct on-screen buttons, closer-view sections work, Enter and Space visit the correct room, a double click creates one visit, and the doors stay closed until the scene is ready. Returning during preparation aborts the visit without a late door opening.

## Checks with the actual providers

- Anthropic classified an uploaded room illustration as a catalogue/screen offering and graded it C. Its personalised rhyming response kept the favour open. A typed blue watering can received A and unlocked the keepsake, without claiming photo verification.
- ElevenLabs generated both personalised replies in the configured voice. Replay and the downloadable successful reply reused the cached recording.
- Reactor played the illustrated-reference introduction, one movement instruction and character request through the camera handoff. A separate bounded return-scene check sent a real graded offering's constructed prompt to Reactor, played the character's reply with ElevenLabs speech, held the final frame and revealed the grade card.

The Reactor introduction and return were verified in separate runs. One uninterrupted four-clip live visit has not passed a complete recorded check. The app coordinates the spoken words with the scene, but does not promise exact lip synchronisation. The optional live conversation agent is not configured; the spoken request, verdict and keepsake work without it.

These checks verify the local demo and provider calls. Pushing the repository does not deploy a public site. Phone camera access requires HTTPS or localhost.
