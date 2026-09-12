// Up and Out web server: static site + two small API routes.
//   POST /api/token  mints a session-scoped Reactor JWT (the rk_ key stays here)
//   POST /api/grade  grades the light bulb photo (Anthropic vision, or mock)
//   GET  /api/config tells the page what is switched on
require("dotenv").config();
const path = require("path");
const express = require("express");
const { grade } = require("./grader");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.REACTOR_MODEL || "reactor/lingbot-world-2";
const SESSION_MAX = Number(process.env.SESSION_MAX_SECONDS || 900);

app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1h", extensions: ["html"] }));

app.get("/api/config", (_req, res) => {
  res.json({
    model: MODEL,
    live: Boolean(process.env.REACTOR_API_KEY),
    grader: process.env.MOCK_AI === "1" ? "mock" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock",
  });
});

// Session-scoped token: one model, a few sessions, hard per-session cap as a cost fuse.
app.post("/api/token", async (_req, res) => {
  if (!process.env.REACTOR_API_KEY) return res.status(503).json({ error: "REACTOR_API_KEY is not set on the server" });
  try {
    const r = await fetch("https://api.reactor.inc/tokens", {
      method: "POST",
      headers: { "Reactor-API-Key": process.env.REACTOR_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization_details: [{
          type: "session",
          resources: { models: { match: [MODEL] } },
          constraints: { max_sessions: 5, max_session_duration_seconds: SESSION_MAX },
        }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: `Reactor token request failed: ${r.status} ${await r.text()}` });
    const { jwt, expires_at } = await r.json();
    res.json({ jwt, expires_at, model: MODEL });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Photo grade. Body: { image: "data:image/jpeg;base64,...", task?: string }
app.post("/api/grade", async (req, res) => {
  try {
    const { image, task } = req.body || {};
    if (!image || !image.startsWith("data:image/")) return res.status(400).json({ error: "image must be a data URL" });
    res.json(await grade(image, task));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`up-and-out on :${PORT}  model=${MODEL}  live=${Boolean(process.env.REACTOR_API_KEY)}  grader=${process.env.MOCK_AI === "1" ? "mock" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock"}`);
});
