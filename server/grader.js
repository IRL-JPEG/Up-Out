// Grades the fetch-quest photo in character. Same JSON shape as Do Me A Favor's
// grader ({ grade, headline, response, provenance }) so the two can be swapped.
// MOCK_AI=1 (or no key) returns a canned pass so the whole flow runs without keys.
require("dotenv").config();

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MOCK = process.env.MOCK_AI === "1" || !process.env.ANTHROPIC_API_KEY;

let anthropic = null;
if (!MOCK) {
  const Anthropic = require("@anthropic-ai/sdk");
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const CHARACTER = `You are a small, polite creature who lives in Storeroom 54, a dark storeroom in a sweet
factory. You asked a visitor for a light bulb. You are hopeful, a little anxious, and very grateful.`;

const RUBRIC = `Grade the submitted photo for the task: "{TASK}".
Inspect the whole image before judging the object. Add a "provenance" field:
- "real_world" when the image is a direct camera photo of a physical scene;
- "catalogue_or_screen" when there is app or browser chrome, a listing, a stock shot, or a photo of a screen;
- "uncertain" otherwise.
Grades: "A*" a real light bulb clearly held in a human hand; "A" a real bulb with a hand touching or holding it;
"B" a real bulb but no hand; "C" something bulb-like or a lamp; "F" nothing like a bulb.
If provenance is not "real_world" the grade must be C or lower.
Reply ONLY with JSON: {"grade":"A*|A|B|C|F","headline":"THREE WORDS IN CAPS","response":"one or two sentences in character, 25 words max","provenance":"real_world|catalogue_or_screen|uncertain"}`;

const MOCK_PASS = { grade: "A", headline: "THAT IS A BULB", response: "Oh. Oh yes. A bulb, a hand, and a whole storeroom about to be a lot less frightening.", provenance: "real_world" };

function parseJSON(text) {
  return JSON.parse(text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
}

async function grade(dataUrl, task = "a light bulb held in a hand") {
  if (MOCK) return { ...MOCK_PASS, mock: true };
  const [meta, data] = dataUrl.split(",");
  const media_type = (meta.match(/data:(image\/[a-z]+)/) || [])[1] || "image/jpeg";
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: CHARACTER,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type, data } },
      { type: "text", text: RUBRIC.replace("{TASK}", task) },
    ] }],
  });
  const text = msg.content.map((c) => c.text || "").join("");
  const out = parseJSON(text);
  if (!["A*", "A", "B", "C", "F"].includes(out.grade)) out.grade = "C";
  return out;
}

module.exports = { grade };
