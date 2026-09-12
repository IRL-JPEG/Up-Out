/* Canonical room packages, shared by the browser and the story server. */
(function (root) {
  const source = typeof module !== "undefined" && module.exports ? require("./rooms-data") : root.RoomSource;
  if (!source || source.rooms.length !== 45) throw new Error("The complete 45-room content package is required");
  const visualStyle = "Scratchy dip-pen ink animation, loose splashy watercolour washes, wobbly lively lines, visible white paper, tiny wiry illustrated workers. Preserve the drawing style and palette of the supplied references. Portrait 9:16 framing; no photorealism, no rendered lettering or captions.";
  const character = { id: "factory-oompa", name: "Your Oompa-Loompa", role: "Factory guide", description: "a tiny wiry Oompa-Loompa with a tuft of green hair, orange face, brown shirt, white crossed braces and white trousers" };
  // Landmarks and motion are authored per room so a turn leads somewhere specific.
  const staging = {
    "chocolate-room": ["pink boat", "waterfall trickles and soft oars", "follow the chocolate riverbank while the little boat noses toward a mooring"],
    "inventing-room": ["tiny machine drawer", "bubbling bottles and gentle copper clicks", "pass the low workbench as the ladder worker catches a bobbing cork"],
    "nut-room": ["squirrels' tapping table", "tiny taps and rustling shells", "move alongside the seated squirrels while a walnut passes from paw to paw"],
    "television-room": ["old television set", "a soft electrical hum and camera wheels", "edge around the camera rails as the tiny chocolate bar appears in the television"],
    "rock-candy-mine": ["candy cart", "gentle pick taps and creaking winch", "follow the level mine track as lanterns illuminate blue and pink crystals"],
    "cokernut-ice-rinks": ["lollipop lamp", "light skate scrapes and coconut snow", "glide a little way onto the rink while the workers make wobbling skating loops"],
    "strawberry-juice-water-pistols": ["pink target wall", "playful splashes and dripping juice", "look along the gallery as a worker squeezes a little arc of strawberry juice onto a target"],
    "toffee-apple-trees": ["potted saplings", "leaves rustling and baskets settling", "follow the orchard's narrow path as a little apple drops into a waiting basket"],
    "exploding-sweets": ["wrapped sweet shelf", "soft paper pops and tiny bells", "stay on the visitor path as a small sweet opens into harmless paper stars"],
    "luminous-lollies": ["lollipop reading light", "quiet glass clinks and a sleepy room tone", "move toward the little bedside rack as one lollipop glows softly yellow"],
    "mint-jujubes": ["green jujube conveyor", "small conveyor ticks and sugar falling", "follow a tray of mint jujubes while a worker flashes a very green grin"],
    "cavity-filling-caramels": ["giant tooth model", "gentle caramel drips and spoon taps", "move past the cosy clinic bench as golden caramel fills a tooth-shaped mould"],
    "stickjaw": ["toffee wrapping bench", "soft paper folding and an occasional sticky squeak", "tiptoe past the wrapping bench while workers communicate with tiny shushing gestures"],
    "wriggle-sweets": ["wobbly jelly trays", "gentle jelly plips and quiet giggles", "follow a wriggle-sweet along a low tray while a keeper gently guides it home"],
    "invisible-chocolate-bars": ["floating wrapper", "paper rustles and barely audible counting", "look past apparently empty shelves while a wrapper folds around an invisible bar"],
    "sugar-coated-pencils": ["sparkling sugar tray", "pencils rolling and paper rustles", "pass the small writing desk as a worker rolls a striped pencil through sugar"],
    "fizzy-lemonade-pools": ["lemon-slice float", "soft fizz and water ripples", "follow the poolside path as a floating lemon slice bobs under rising bubbles"],
    "magic-hand-fudge": ["fudge tasting table", "a gentle kitchen hum and contented sighs", "pass the tasting table as workers hold fudge in open palms and smile with closed mouths"],
    "rainbow-drops": ["six coloured targets", "gentle droplets splashing", "follow the painted walkway while coloured arcs settle into little rainbow puddles"],
    "storeroom-54-creams": ["cream barrel stack", "jugs clinking and a little brush sweeping", "turn through a snug gap between the cream barrels while a worker fusses over glossy hair"],
    "storeroom-71-whips": ["whipped cream bowl", "soft claps and cream whisking", "approach the demonstration bench as a plume of cream wobbles back into its bowl"],
    "storeroom-77-beans": ["Has-Beans' tea bench", "teacups settling and bean sacks rustling", "wander between bean sacks toward the old sweets accepting a very small cup of tea"],
    "marshmallow-pillows": ["marshmallow bed", "gentle pillow puffs and sleepy sighs", "tiptoe beside the marshmallow beds as one pillow gives a soft bouncing wobble"],
    "lickable-wallpaper": ["purple berry wallpaper", "paint brushes swishing and ladder creaks", "look along the fruit-patterned wall as a worker considers a mysterious purple berry"],
    "hot-ice-creams": ["chimney ice-cream cart", "quiet wind outside and gentle steam", "pass the scarf rack toward the steaming ice-cream cart while a worker warms rosy cheeks"],
    "chocolate-milk-cows": ["chocolate milk churn", "soft cow bells and milk trickling", "follow the barn path while a spotted brown cow peers at the elevator"],
    "fizzy-lifting-drinks": ["tethered floating worker", "tiny bottle fizz and soft airy pops", "look upward from the visitor platform as a floating worker slowly bobs down"],
    "square-sweets": ["watchful square sweet shelf", "tiny paper shuffles and quiet footfalls", "take one little step while every square sweet swivels its eyes toward the doorway"],
    "butterscotch-buttergin": ["small doorman", "gentle humming and wooden stool creaks", "stay by the snug doorway as the stern little doorman peers around the door"],
    "strawberry-fudge-room": ["pink fudge pipe", "soft pipe glugs and spanner clinks", "follow the fudge vat's outer path while workers study one gently bulging pipe"],
    "juicing-room": ["large juice jug", "juice pouring and cushion rustles", "approach the cushioned workbench as a worker carefully sets down the enormous jug"],
    "rubbish-chute-furnace": ["wrapper sorting pile", "a soft sweeping broom and rustling paper", "follow the tidy visitor path as a worker sweeps wrappers beside the closed cold furnace"],
    "taffy-pulling-room": ["pink taffy ribbon", "slow stretching squeaks and little pulley turns", "look along the soft pink ribbon as it stretches slowly between the pulling arms"],
    "minusland": ["little lantern", "barely audible mist and elevator hum", "remain inside the glass elevator and lean gently toward the view as a tiny lantern glows in the grey mist"],
    "glass-roof": ["starry roof hatch", "quiet lift cables and faraway mop swishes", "remain on the glass elevator platform and look upward as stars appear beyond the roof hatch"],
    "vanilla-fudge-mountain": ["winding fudge railway", "tiny wagon wheels and soft sugar taps", "follow the level viewing path as a small wagon brings a pale fudge chunk down the mountain"],
    "pounding-and-cutting-room": ["fudge cube sorting tray", "muffled rhythmic taps and wagon wheels", "stay on the visitor path as covered sweet-making machines turn fudge into neat little cubes"],
    "spotty-powder-room": ["spotty mirror", "soft powder puffs and contented chuckles", "move toward the mirror as a worker turns to admire a new set of colourful spots"],
    "never-melting-ice-cream": ["towering ice-cream cone", "gentle fans and sunhat rustles", "follow the sunny counter while a worker fans a cone that remains perfectly firm"],
    "violet-marshmallow-parlour": ["vase of violets", "glass jar lids and drifting petals", "approach the little counter as purple petals drift across the marshmallow jars"],
    "colour-changing-caramels": ["colour-changing caramel tray", "stopwatches ticking and paper wrappers", "look over the sorting tray as a caramel shifts from pink to blue"],
    "feather-sweet-loft": ["open attic window", "soft air and delicate paper rustles", "move gently through the airy loft as feather-light sweets drift around a worker's outstretched hands"],
    "sugar-balloon-room": ["large sugar balloon", "little sugar pops and falling crumbs", "weave slowly along the clear path while a little balloon pops into harmless sweet crumbs"],
    "sugar-bird-hatchery": ["blue speckled eggs", "tiny sleepy birdsong and warm lamps", "tiptoe toward a nest as one pink sugar bird peeks through a cracked blue egg"],
    "palace-annex": ["chocolate palace moat", "slow chocolate drips and a trowel tapping", "follow the model palace's outer path as a worker gently patches a drooping chocolate dome"],
  };
  const legacyAliases = { coconut: "cokernut-ice-rinks", mint: "mint-jujubes", caramels: "cavity-filling-caramels", wriggle: "wriggle-sweets", invisible: "invisible-chocolate-bars", pencils: "sugar-coated-pencils", fizzy: "fizzy-lemonade-pools", fudge: "magic-hand-fudge", rainbow: "rainbow-drops", storeroom: "storeroom-54-creams" };
  const floors = Object.fromEntries(source.rooms.map((room, index) => {
    const [landmark, sound, movementDescription] = staging[room.id];
    const cast = { ...character, ...room.character, description: `${room.character.name}, ${room.character.role}, a tiny wiry Oompa-Loompa with a tuft of green hair, orange face and room-specific workclothes matching the foreground character in <Picture 2>, drawn with lively scratchy ink gestures` };
    const setting = room.imagePrompt.split(/\s+Scratchy/i)[0].replace(/\.$/, "");
    const floor = {
      id: room.id, label: room.room, order: index + 1, wall: room.wall, legend: room.wall === 5, optional: room.wall === 5,
      canon: room.canon || "Optional legend floor", setting, light: "loose luminous watercolour on white paper", sound,
      movement: room.id === "cokernut-ice-rinks" ? "skate" : "walk", landmark, character: cast,
      references: [`/assets/rooms/${room.id}-arrival.png`, `/assets/rooms/${room.id}-encounter.png`],
      imagePrompt: room.imagePrompt, need: room.need, needShort: room.needShort,
      quest: { object: room.needShort.replace(/\.$/, ""), task: room.need, problem: room.intro, reward: `A little thank-you from ${room.character.name} in ${room.room}.` },
      ask: room.intro,
      tour: `Begin halfway inside the open glass elevator: its near door jamb, a little side wall and the threshold remain visible in the foreground. Gently ${movementDescription}. Keep the foreground close and the room busy with small, distinct activities. Settle on the ${landmark}.`,
      suggestions: [room.id === "cokernut-ice-rinks" ? "Skate forward" : "Look around", `Look toward the ${landmark}`, "Look to the left"],
      grading: { ...room.grading }, speech: { ...room.speech },
      sharedGradingSystemPrompt: source.shared.gradingSystemPromptBase,
      validationPrompt: `${source.shared.gradingSystemPromptBase}\n\n${room.grading.roomBlock}\n\nThe request shown to the rider is: ${room.need}`,
    };
    return [room.id, floor];
  }));
  // Old saved visits and button ids still resolve; only canonical rooms enumerate.
  for (const [oldId, id] of Object.entries(legacyAliases)) Object.defineProperty(floors, oldId, { value: floors[id], enumerable: false });
  const actions = {
    forward: f => ["minusland", "glass-roof", "butterscotch-buttergin"].includes(f.id)
      ? `The viewpoint leans forward a little from the elevator threshold to look toward the ${f.landmark}, then settles.`
      : `The first-person viewpoint ${f.movement === "skate" ? "skates" : "walks"} slowly along the clear visitor path toward the ${f.landmark}, then settles.`,
    left: () => "The first-person viewpoint turns slowly left, revealing another small activity in this same illustrated room, then settles.",
    right: () => "The first-person viewpoint turns slowly right, revealing another small activity in this same illustrated room, then settles.",
    look: f => `The first-person viewpoint looks closely toward the ${f.landmark}, then settles.`,
    back: () => "The first-person viewpoint moves gently back toward the visible glass elevator threshold, then settles.",
  };
  function speechSegments(script, maxWords = 32) {
    const words = script.trim().split(/\s+/), segments = [];
    for (let i = 0; i < words.length; i += maxWords) segments.push(words.slice(i, i + maxWords).join(" "));
    return segments;
  }
  function clipPlan(floor, beat, action = "forward") {
    if (!floor || !["tour", "instruction", "ask", "reunion"].includes(beat)) throw new Error("Unknown story beat");
    const cast = beat === "ask" || beat === "reunion";
    const scene = `${floor.setting}. ${floor.sound}. ${visualStyle} Match the room layout and drawing in <Picture 1>. First-person viewpoint, one gentle continuous shot. Keep the room recognisable and the distant workers quietly occupied.`;
    const beats = {
      tour: floor.tour,
      instruction: (actions[action] || actions.forward)(floor),
      ask: `Move gently toward the different room angle in <Picture 2>. ${floor.character.description}, matching the foreground worker in <Picture 2>, comes close to the viewer at chest-up scale, makes kind eye contact and delivers this one request: "${floor.ask}" ${floor.character.name} is the only speaker; use gentle expressive hands and small, sleepy gestures. The app plays the complete character speech. Finish on the same character's expectant face, mouth closed, holding still for the last two seconds. No fade and no loop: the app holds the last frame for any remaining speech before crossfading to the camera.`,
      reunion: `Return to the room angle and same character in <Picture 2>. ${floor.character.description} looks toward the rider, gestures toward the ${floor.landmark} and responds warmly to the thing the rider found. The app adds the observed item and the exact freshly graded dialogue to this prompt and plays that character's voice. Keep the reaction kind at every grade. Finish on the character listening, mouth closed, hold the last two seconds. No titles, grade letters, fade or loop; the app stamps the grade over the final frame.`,
    };
    return {
      beat, prompt: `${scene} ${beats[beat]}${cast ? "" : " Background ensemble only; the foreground quest character has not approached yet. Ambient sound without dialogue."}`,
      references: cast ? [...floor.references] : [floor.references[0]], seconds: cast ? 15 : 8.5,
      ...(beat === "ask" ? { spokenScript: floor.ask, speechSegments: speechSegments(floor.ask), holdForSpeech: true } : {}),
    };
  }
  const api = { floors, character, legacyAliases, actions: Object.keys(actions), clipPlan, sharedGradingSystemPrompt: source.shared.gradingSystemPromptBase, sharedGrading: source.shared };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FloorContent = api;
})(typeof window !== "undefined" ? window : globalThis);
