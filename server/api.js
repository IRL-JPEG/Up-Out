const express = require("express");
const { randomUUID, createHash } = require("node:crypto");
const { Journeys, fail } = require("./journeys");
const { floors, character } = require("../public/js/floors");
const providers = require("./providers");
const MODEL = "reactor/h3-reference-to-video-turbo-realtime";
const voiceFor = floor => floor.character?.voiceId || floor.speech?.voiceId || process.env.ELEVENLABS_VOICE_ID;
const voiceAvailable = floor => Boolean(process.env.ELEVENLABS_API_KEY && voiceFor(floor));
function createApp(deps = {}) {
  const app = express(), journeys = new Journeys(), limits = new Map();
  const p = { ...providers, ...deps };
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "GET" && (req.get("sec-fetch-site") === "cross-site" || (req.get("origin") && new URL(req.get("origin")).host !== req.get("host")))) return res.status(403).json({ error: "Please use the app to do that." });
    let owner = req.headers.cookie?.match(/(?:^|;\s*)uo_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
    if (!owner) { owner = randomUUID(); res.cookie("uo_session", owner, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 4 * 3600000 }); }
    req.owner = owner;
    const key = req.ip;
    const now = Date.now();
    if (limits.size > 5000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    let bucket = limits.get(key);
    if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 60000 }; limits.set(key, bucket); }
    if (++bucket.count > 100) return res.status(429).set("Retry-After", "60").json({ error: "The lift needs a moment. Try again in a minute." });
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  const route = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  const publicJourney = j => ({ id: j.id, floorId: j.floorId, state: j.state, preview: j.preview, rehearsal: j.rehearsal, demoCompletion: Boolean(j.demoCompletion), result: j.result || null });
  const getJourney = req => journeys.get(req.params.id || req.body.journeyId, req.owner);
  const locked = fn => route(async (req, res) => {
    const j = getJourney(req);
    if (j.busy) throw fail("The character is still checking. Please wait.");
    j.busy = true;
    try { await fn(req, res, j); } finally { j.busy = false; }
  });
  app.get("/api/config", (_req, res) => res.json({ model: MODEL, live: Boolean(process.env.REACTOR_API_KEY) && process.env.MOCK_AI !== "1", preview: process.env.MOCK_AI === "1", demo: process.env.DEMO_MODE === "1", grader: process.env.ANTHROPIC_API_KEY ? "anthropic" : "unavailable", voice: Object.values(floors).some(voiceAvailable), agent: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID), evidenceTypes: ["photo", "text"], readyFloors: Object.values(floors).filter(f => f.references.every(ref => require("node:fs").existsSync(require("node:path").join(__dirname, "..", "public", ref)))).map(f => f.id) }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/journey", route(async (req, res) => {
    const preview = req.body.preview === true || process.env.MOCK_AI === "1";
    const rehearsal = process.env.MOCK_AI === "1" || (typeof req.body.rehearsal === "boolean" ? req.body.rehearsal : preview);
    if (!preview && !process.env.REACTOR_API_KEY) throw fail("Live floors need Reactor setup. Choose illustrated preview to try the story.", 503);
    res.json(publicJourney(journeys.create(req.owner, req.body.floorId, preview, rehearsal)));
  }));
  app.get("/api/journey/:id", route(async (req, res) => res.json(publicJourney(getJourney(req)))));
  app.delete("/api/journey/:id", route(async (req, res) => { journeys.items.delete(getJourney(req).id); res.json({ ok: true }); }));
  app.post("/api/journey/:id/instruction", locked(async (req, res, j) => {
    if (j.state !== "choice") throw fail("Your first instruction is already part of the story.");
    journeys.instruction(j, await p.translate(req.body.instruction, floors[j.floorId], j.rehearsal));
    res.json(publicJourney(j));
  }));
  app.post("/api/journey/:id/clip", locked(async (_req, res, j) => res.json({ ...journeys.plan(j), externalVoice: j.state === "reunion" && Boolean(j.result) || j.state === "ask" && voiceAvailable(floors[j.floorId]) })));
  app.post("/api/journey/:id/complete", locked(async (req, res, j) => { journeys.complete(j, req.body.playbackId); res.json(publicJourney(j)); }));
  app.post("/api/journey/:id/demo-complete", locked(async (_req, res, j) => {
    if (process.env.DEMO_MODE !== "1") throw fail("Demo skip is not enabled.", 403);
    if (j.state !== "quest") throw fail("The character needs to finish asking first.");
    j.demoCompletion = true; j.validated = false; j.result = null; j.audio = null; j.lastSubmissionHash = null; j.pending = null; j.state = "reunion";
    res.json(publicJourney(j));
  }));
  app.post("/api/token", locked(async (_req, res, j) => {
    if (j.preview || !process.env.REACTOR_API_KEY) throw fail("Live video is not configured.", 503);
    if ((j.tokens || 0) >= 4) throw fail("This visit has used its reconnect allowance. Start a new visit.", 429);
    j.tokens = (j.tokens || 0) + 1;
    const r = await p.upstream("https://api.reactor.inc/tokens", { method: "POST", headers: { "Reactor-API-Key": process.env.REACTOR_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ authorization_details: [{ type: "session", resources: { models: { match: [MODEL] } }, constraints: { max_sessions: 1, max_session_duration_seconds: Math.min(900, Math.max(60, Number(process.env.SESSION_MAX_SECONDS) || 300)) } }] }) }, "Reactor");
    const { jwt, expires_at } = await r.json(); if (!jwt) throw fail("Reactor did not return a session token.", 502);
    res.json({ jwt, expires_at, model: MODEL });
  }));
  app.post("/api/grade", locked(async (req, res, j) => {
    const hasAnswer = Object.hasOwn(req.body, "answer");
    if (hasAnswer && Object.hasOwn(req.body, "image")) throw fail("Send a photo or a written answer, one at a time.", 400);
    const submission = hasAnswer ? req.body.answer : req.body.image;
    if (typeof submission !== "string") throw fail("Show a photo or describe your offering first.", 400);
    if (hasAnswer) providers.typedAnswer(submission);
    const submissionHash = createHash("sha256").update(hasAnswer ? "text:" : "photo:").update(submission).digest("hex");
    // A lost HTTP response can be retried without another paid check or a new verdict.
    if (j.state !== "quest" && j.lastSubmissionHash === submissionHash && j.result) return res.json({ ...j.result, journey: publicJourney(j) });
    if (j.state !== "quest") throw fail("Wait for the character to ask for an offering.");
    if ((j.attempts || 0) >= 12) throw fail("That is enough checks for this visit. Start a fresh visit when you are ready.", 429);
    j.attempts = (j.attempts || 0) + 1;
    const checked = await p.grade(req.body.image, floors[j.floorId], j.rehearsal, hasAnswer ? req.body.answer : undefined);
    const result = journeys.acceptGrade(j, { ...checked, evidenceType: hasAnswer ? "text" : "photo" });
    j.lastSubmissionHash = submissionHash;
    res.json({ ...result, journey: publicJourney(j) });
  }));
  async function speech(j, ask = false) {
    const floor = floors[j.floorId], name = floor.character?.name || character.name;
    if (!voiceAvailable(floor)) throw fail(`${name}'s voice needs an ElevenLabs API key and voice ID on the server.`, 503);
    const key = ask ? "askAudio" : "audio";
    if (!j[key]) {
      const model = process.env.ELEVENLABS_TTS_MODEL || "eleven_v3";
      const text = ask ? floor.ask : model === "eleven_v3" ? j.result.ttsResponse : j.result.response;
      const r = await p.upstream(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceFor(floor))}?output_format=mp3_44100_128`, { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5 } }) }, `${name}'s voice`);
      j[key] = Buffer.from(await r.arrayBuffer());
    }
    return j[key];
  }
  app.post("/api/speech", locked(async (req, res, j) => {
    const ask = j.state === "ask";
    if (j.rehearsal || (!ask && (!["reunion", "quest", "reward"].includes(j.state) || !j.result))) throw fail("The character speaks during the request or after an offering.", 403);
    if (!ask && req.body.resultId !== j.result.id) throw fail("That photo response has changed.");
    res.type("audio/mpeg").send(await speech(j, ask));
  }));
  app.post("/api/reward", locked(async (_req, res, j) => {
    journeys.requireReward(j);
    res.type("audio/mpeg").send(await speech(j));
  }));
  app.post("/api/agent-session", locked(async (_req, res, j) => {
    journeys.requireReward(j);
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) throw fail("The character's conversation agent is not configured yet.", 503);
    if ((j.chats || 0) >= 3) throw fail("The character needs a rest. You can visit again for another chat.", 429);
    j.chats = (j.chats || 0) + 1;
    const r = await p.upstream(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID)}`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }, "The character's conversation");
    const data = await r.json(); if (!data.signed_url) throw fail("The character's conversation could not start.", 502);
    const floor = floors[j.floorId];
    res.json({ signedUrl: data.signed_url, dynamicVariables: { character_name: floor.character?.name || character.name, floor_name: floor.label, quest_object: floor.needShort || floor.quest.object, quest_status: `The visitor completed the room's offering challenge. Evidence type: ${j.result.evidenceType}. Grade: ${j.result.grade}. Offered object: ${j.result.observedObject}. Your thank-you: ${j.result.response}${floor.id === "butterscotch-buttergin" ? " The doorman still refuses entry; the door remains shut." : ""}` } });
  }));
  app.use(express.static(require("node:path").join(__dirname, "..", "public"), { maxAge: "0" }));
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === "entity.too.large" ? 413 : 502);
    res.status(status).json({ error: err.status ? err.message : "Something interrupted the request. Your progress is saved; please try again." });
  });
  return app;
}
module.exports = { createApp, MODEL };
