# Up and Out · web app

A lift panel you press, floors rendered by a world model, and one floor (Storeroom 54) that sends you into the real world with a camera. Node + Express serving a static front end, no build step.

```
npm install
cp .env.example .env        # add keys, or leave them out and run in mock mode
npm run dev                 # MOCK_AI=1, http://localhost:3000
npm start                   # production
```

Heroku: `Procfile` and `app.json` are in place. Set `REACTOR_API_KEY`, `ANTHROPIC_API_KEY`, and (optionally) `REACTOR_MODEL` as config vars. Without `REACTOR_API_KEY` the floors run on painted placeholders; without `ANTHROPIC_API_KEY` the photo grader always passes.

## What is where

```
server/index.js        Express: static, POST /api/token, POST /api/grade, GET /api/config
server/grader.js       Anthropic vision grade in character; same JSON shape as Do Me A Favor
public/index.html      markup: scene, transit dial, doors, world layer, quest card, drawer
public/css/app.css     the hand-drawn UI (paper, ink, Patrick Hand)
public/js/content.js   HOTS (hotspots as % of the panel image), spoken lines, prompt layers, helpers
public/js/audio.js     hum, ding, click, spoken lines (Web Speech placeholder), spatial whisper bed
public/js/spatial.js   spatial audio starter: listener, CameraPose / WorldPose providers, sources, arrival
public/js/worlds.js    MockWorld (painted still that comes alive) and ReactorWorld (LingBot World 2)
public/js/app.js       the ride: overlay, press, transit, doors, D-pad, quest, drawer
public/assets/         lift-panel.jpg (the panel image)
public/seeds/          drop mint.jpg, fizzy.jpg, rainbow.jpg (16:9) as world-model reference images
public/intro/          drop intro.mp4 (plays on first tap, panel appears on its last frame)
docs/                  the study, the bake/audio/hunt addendum, the phone-motion report, the spatial handoff
```

## Filling the panel

Hotspots live in `public/js/content.js` as `HOTS`. Each entry: `plaque` (x1, y1, x2, y2 as percent of the image), `sw` (the switch that visibly toggles), `kind` (`floor`, `quest`, `dud`, `upandout`), spoken `transit` and `arrival` lines, and for floors the layered prompt (`base`, camera and movement variants). Add or move entries and the overlay follows; the image can be swapped for a video frame later without changing anything else.

## The Reactor SDK

Loaded in the browser from `https://esm.sh/@reactor-team/js-sdk@3.0.2` when a live session starts (see `worlds.js`). To vendor it, `npm i @reactor-team/js-sdk` and serve `node_modules/@reactor-team/js-sdk/dist` with an import map for its dependencies; it is ESM.

## Where the quest plumbing should go next

The grader is a stand-in for the Do Me A Favor pipeline (`services/grader.js` there has the provenance guard and the Eleven v3 tags) and for True Action's just-in-time second frame and same-object check. `POST /api/grade` takes `{ image, task }` and returns `{ grade, headline, response, provenance }`; point it at either service without touching the front end.
