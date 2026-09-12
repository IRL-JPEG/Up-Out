/* The app, rather than generated dialogue, owns every story transition. */
let CONFIG = { live: false, grader: "unavailable", voice: false, agent: false, readyFloors: [] };
let mode = "intro", journey = null, world = null, controller = null, generation = 0;
let preview = true, rehearsal = true, cameraStream = null, photo = null, conversation = null, rewardUrl = null, chatTimer = null;
const dialogueAudio = document.createElement("audio");
let dialogueUrl = null, cancelDialogue = null;
let needle = -70, needleTarget = -70;
const completedFloors = new Set();
const storage = { get() { try { return sessionStorage.getItem("uo_visit"); } catch { return null; } }, set(id) { try { id ? sessionStorage.setItem("uo_visit", id) : sessionStorage.removeItem("uo_visit"); } catch {} } };
async function api(path, body, options = {}) {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller?.signal, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The lift lost its connection. Please retry.");
  return data;
}
function saveJourney(j) { journey = j; storage.set(j.id); }
function guide() { return floor().character.name; }
function floor() { return FloorContent.floors[journey.floorId]; }
function status(text) { const still=journey?.preview??preview, practice=journey?.rehearsal??rehearsal;setState(`${practice?"Rehearsal":still?"Illustrated · real quests":"Live video"} · ${text}`); }
function stopSpeech() { window.speechSynthesis?.cancel(); dialogueAudio.pause(); cancelDialogue?.(); }
function sameVisit(id) { return id === generation && !controller?.signal.aborted; }
function showError(error) {
  if (error.name === "AbortError" || !journey) return;
  mode = "error"; $("storyError").textContent = error.message; $("storyRetry").hidden = false;
  $("storyStatus").classList.add("has-error");
  $("storyStatus").hidden = false; $("storyStatusText").textContent = "The story is waiting for you.";
  status("scene paused"); $("stepIn").hidden = false;
}

// The supplied artwork is one intact image; every labelled control has its own hit regions.
const NS = "http://www.w3.org/2000/svg";
function svg(tag, attrs, parent) { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v)); parent.append(n); return n; }
const hotEls = {};
$("overlay").setAttribute("viewBox", `0 0 ${LiftPanelContent.width} ${LiftPanelContent.height}`);
for (const h of LiftPanelContent.sections) {
  const g = svg("g", { class: "hot", role: "button", tabindex: "-1", "aria-label": h.label, "data-id": h.id, "aria-disabled":"true" }, $("hots")); hotEls[h.id] = g;
  svg("title", {}, g).textContent = h.label;
  for (const region of h.regions) {
    const { type, ...attributes } = region;
    svg(type, { ...attributes, class:"selection" }, g);
    svg(type, { ...attributes, class:"hit" }, g);
  }
  const press = () => { if (mode === "idle" && g.getAttribute("aria-disabled") !== "true") begin(h.id); };
  g.addEventListener("click", press);
  g.addEventListener("keydown", e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); press(); } });
  g.addEventListener("focus", () => { if ($("panelViewport").classList.contains("zoomed")) g.scrollIntoView({ block:"nearest", inline:"nearest" }); });
}
function setPanelActive(active) {
  $("panelViewport").inert = !active; $("overlay").classList.toggle("on",active); $("panelTools").hidden = !active;
  for(const [id,el] of Object.entries(hotEls)){
    const enabled=active && CONFIG.readyFloors.includes(id);
    el.setAttribute("aria-disabled",String(!enabled));el.setAttribute("tabindex",enabled?"0":"-1");
  }
}
function setPanelZoom(zoom, section="middle") {
  const viewport=$("panelViewport"); viewport.classList.toggle("zoomed",zoom);
  $("panelZoom").setAttribute("aria-pressed",String(zoom));$("panelZoom").setAttribute("aria-label",zoom?"Show the whole lift":"Enlarge lift buttons");
  $("panelZoom").textContent=zoom?"whole lift −":"closer look +";$("panelSections").hidden=!zoom;
  for(const b of $("panelSections").children)b.setAttribute("aria-pressed",String(zoom&&b.dataset.section===section));
  const position={upper:.23,middle:.49,lower:.74}[section]??.49;
  viewport.scrollTo({left:zoom?(viewport.scrollWidth-viewport.clientWidth)/2:0,top:zoom?viewport.scrollHeight*position-viewport.clientHeight/2:0,behavior:"instant"});
  if(mode==="idle")setLine(zoom?"Drag to explore. Tap a label to go.":"Tap a label. Every button has somewhere to go.");
}
$("panelZoom").onclick=()=>{if(mode==="idle")setPanelZoom(!$("panelViewport").classList.contains("zoomed"));};
for(const b of $("panelSections").children)b.onclick=()=>{if(mode==="idle")setPanelZoom(true,b.dataset.section);};
LiftMotion.reset();setPanelActive(false);$("floorMenu").hidden=true;$("liveBtn").hidden=true;
for (let i=0;i<9;i++) {
  const a=(-70+i*17.5)*Math.PI/180;
  svg("line", { x1:180+Math.sin(a)*128,y1:92-Math.cos(a)*128,x2:180+Math.sin(a)*140,y2:92-Math.cos(a)*140,stroke:"#2b2a2e","stroke-width":3 }, $("ticks"));
}
let activeWall=0;
for(let wall=0;wall<=5;wall++){
  const b=document.createElement("button"); b.className="chip";b.type="button";b.textContent=wall===0?"All":wall===5?"Legends":`Wall ${wall}`;b.dataset.wall=wall;
  b.onclick=()=>{activeWall=wall;renderRooms();};$("wallTabs").append(b);
}
function renderRooms(){
  const query=$("roomSearch").value.trim().toLowerCase();$("floorList").replaceChildren();
  for(const b of $("wallTabs").children)b.setAttribute("aria-pressed",String(Number(b.dataset.wall)===activeWall));
  for (const f of Object.values(FloorContent.floors)) {
    if(activeWall && f.wall!==activeWall || query && !`${f.label} ${f.character.name} ${f.needShort}`.toLowerCase().includes(query))continue;
    const b = document.createElement("button"); b.className = "floor-option"; b.type = "button"; b.setAttribute("aria-label",f.label);
    const ready=CONFIG.readyFloors?.includes(f.id) ?? true;
    const img = document.createElement(ready?"img":"div");
    if(ready){img.src=f.references[0];img.alt="";img.loading="lazy";}else{img.className="roomPending";img.textContent="Illustration on its way";b.disabled=true;}
    const name = document.createElement("span"); name.textContent = f.label;
    const small=document.createElement("small");small.textContent=`${f.wall===5?"Legend":"Wall "+f.wall} · ${f.character.name}`; b.append(img,name,small);
    b.addEventListener("click", () => { $("floorPicker").close(); begin(f.id); }); $("floorList").append(b);
  }
  $("noRooms").hidden=Boolean($("floorList").children.length);
}
$("roomSearch").oninput=renderRooms;renderRooms();
$("floorMenu").onclick = () => { if (mode === "idle") $("floorPicker").showModal(); };
$("closeFloors").onclick = () => $("floorPicker").close();
const configReady = api("/api/config").then(c => { CONFIG = c; renderRooms(); if(mode==="idle")setPanelActive(true); preview = !c.live; rehearsal = c.preview || !c.live && c.grader === "unavailable"; $("useIllustrated").disabled=c.grader==="unavailable"; $("useLive").disabled = !c.live; $("liveHelp").textContent = c.live ? "Live floors are ready. Each scene takes a moment to come to life." : "Illustrated preview is ready. Live floors need Reactor setup on the server."; }).catch(() => { $("liveHelp").textContent = "The server is unavailable. Start the app server to enter a floor."; });
$("iris").onclick = async () => {
  if (mode !== "intro") return; mode = "entering"; Audio.unlock(); $("iris").classList.add("gone");
  await Promise.all([wait(matchMedia("(prefers-reduced-motion: reduce)").matches?100:900), configReady, $("panel").decode().catch(()=>{})]);
  mode = "idle"; setPanelActive(true);$("floorMenu").hidden=false;$("liveBtn").hidden=false;status("choose a floor");setLine("Tap a label. Every button has somewhere to go.");
  const saved = storage.get();
  if (saved) {
    try { const j = await api(`/api/journey/${saved}`); await enter(j); }
    catch { storage.set(null); setLine("Your previous visit has ended. Choose a floor to start again."); mode = "idle"; }
  }
};
async function begin(floorId) {
  if (mode !== "idle") return;
  const canonical=FloorContent.floors[floorId]?.id;
  if(CONFIG.readyFloors && !CONFIG.readyFloors.includes(canonical)){setLine("This room is still being illustrated. Choose another in the room directory.");return;}
  mode = "busy"; setPanelActive(false); hotEls[canonical]?.classList.add("on"); $("overlay").classList.add("on"); Audio.click();
  try { const [visit]=await Promise.all([api("/api/journey", { floorId, preview, rehearsal }),wait(180)]);await enter(visit); }
  catch (e) { if (journey) showError(e); else { mode = "idle"; setPanelActive(true);hotEls[canonical]?.classList.remove("on"); setLine(e.message); } }
}
async function enter(j) {
  controller?.abort(); controller = new AbortController(); const id = ++generation;
  saveJourney(j); preview = j.preview; rehearsal = j.rehearsal ?? j.preview; mode = "busy";
  world = j.preview ? new PreviewWorld() : new ReactorWorld(j.id);
  $("floorMenu").hidden = true; $("liveBtn").hidden = true; $("stepIn").hidden = false;
  $("floorName").textContent = floor().label; $("floorName").hidden = false;
  hotEls[j.floorId]?.classList.add("on");
  setPanelActive(false);setPanelZoom(false);
  $("dialText").textContent = floor().label; $("transit").classList.add("on"); $("dial").classList.add("shake");
  needleTarget = -65 + Object.keys(FloorContent.floors).indexOf(j.floorId) * 130 / (Object.keys(FloorContent.floors).length-1);
  Audio.setHum(0.06); status("on our way");
  try {
    await Promise.all([LiftMotion.depart({signal:controller.signal}),world.stage(floor(), {connect:["tour","instruction","ask","reunion"].includes(j.state), encounter:["quest","reward","reunion"].includes(j.state)})]);
    if (!sameVisit(id)) return;
    if (j.state === "tour") await drive(id, true);
    else { await openDoors(id); if(sameVisit(id))await drive(id); }
  } catch (e) { if (sameVisit(id)) { stopSpeech(); await world.disconnect().catch(() => {}); showError(e); } }
}
async function openDoors(id = generation) {
  $("transit").classList.remove("on"); $("dial").classList.remove("shake");
  Audio.ding(); Audio.setHum(0.015);
  await LiftMotion.arrive({signal:controller?.signal});
  if(!sameVisit(id))throw new DOMException("Visit ended","AbortError");
}
function stampGrade() {
  const r=journey?.result; $("gradeStamp").hidden=!r;
  if(!r)return;
  $("gradeValue").textContent=r.grade; $("gradeLabel").textContent=`${r.mock ? "Preview · " : ""}${r.rewardLabel}`;
  $("gradeStamp").setAttribute("aria-label",`Grade ${r.grade}. ${r.rewardLabel}${r.mock ? ". Simulated result." : ""}`);
}
async function prepareDialogue(plan, id) {
  $("voiceNotice").hidden=true;
  if(!plan.externalVoice)return undefined;
  const text=plan.dialogue || floor().ask;
  if(journey.rehearsal ?? journey.preview) return ()=>Audio.say(text);
  if(!CONFIG.voice) {
    $("voiceNotice").hidden=false; $("voiceNotice").textContent=`Voice is not configured yet · ${guide()}’s words are shown below.`;
    return undefined;
  }
  const r=await fetch("/api/speech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({journeyId:journey.id,resultId:journey.result?.id}),signal:controller.signal});
  if(!r.ok)throw new Error((await r.json()).error);
  const blob=await r.blob(); if(!sameVisit(id))throw new DOMException("Visit ended","AbortError");
  if(dialogueUrl)URL.revokeObjectURL(dialogueUrl);
  dialogueUrl=URL.createObjectURL(blob);dialogueAudio.src=dialogueUrl;
  return ()=>new Promise((resolve,reject)=>{
    const signal=controller.signal;
    const cleanup=()=>{cancelDialogue=null;clearTimeout(timer);signal.removeEventListener("abort",abort);dialogueAudio.onended=null;dialogueAudio.onerror=null;$("playDialogue").hidden=true;};
    const end=()=>{cleanup();resolve();};
    const abort=()=>{cleanup();dialogueAudio.pause();reject(new DOMException("Visit ended","AbortError"));};
    const timer=setTimeout(()=>{cleanup();dialogueAudio.pause();reject(new Error("The voice stopped. Retry the scene."));},120000);
    cancelDialogue=abort;signal.addEventListener("abort",abort,{once:true});
    dialogueAudio.onended=end;dialogueAudio.onerror=()=>{cleanup();reject(new Error("The recording could not play. Retry the scene."));};
    const play=()=>dialogueAudio.play().then(()=>{$("playDialogue").hidden=true;}).catch(()=>{$("playDialogue").hidden=false;});
    $("playDialogue").textContent=`Hear ${guide()}`;$("playDialogue").onclick=play;play();
  });
}
const beatLines = { tour: "The doors open. Take a little look around.", instruction: "Let's see where that takes us…", ask: "Wait. Someone is trying to get your attention…", reunion: "Someone has been waiting to say thank you." };
async function drive(id = generation, first = false) {
  $("storyRetry").hidden = true; $("storyError").textContent = ""; $("choice").hidden = true;
  $("storyStatus").classList.remove("has-error");
  try {
    while (sameVisit(id) && ["tour","instruction","ask","reunion"].includes(journey.state)) {
      mode = "busy"; const beat = journey.state;
      $("storyStatus").hidden = false; $("storyStatusText").textContent = journey.preview ? "Turning the storybook page…" : "Your next scene is coming to life…";
      const enteringFloor=first || $("doors").classList.contains("closed");
      status(enteringFloor?"on our way":"preparing the scene"); setLine(enteringFloor?"On our way. Hold on to your hat.":beatLines[beat]);
      const plan = await api(`/api/journey/${journey.id}/clip`, {});
      const speak = await prepareDialogue(plan, id);
      await world.prepare(plan); if (!sameVisit(id)) return;
      if (first || $("doors").classList.contains("closed")) { await openDoors(id); if(!sameVisit(id))return; first = false; }
      $("storyStatus").hidden = true; status(beat === "ask" ? `${guide()} needs your help` : "exploring");
      if(enteringFloor)setLine(beatLines[beat]);
      if (beat === "ask") setLine(floor().ask);
      if (plan.dialogue) setLine(plan.dialogue);
      await world.play(speak); if (!sameVisit(id)) return;
      saveJourney(await api(`/api/journey/${journey.id}/complete`, { playbackId: plan.playbackId }));
    }
    if (!sameVisit(id)) return;
    if (journey.state === "choice") showChoice();
    if (journey.state === "quest") { world.holdFrame(); await world.disconnect(); if(sameVisit(id)) {
      if (journey.result) { showResult(false); }
      else { showQuest(); openCamera(); }
    } }
    if (journey.state === "reward") { await world.disconnect(); showReward(); }
  } catch (e) { if (sameVisit(id)) { stopSpeech(); await world.disconnect().catch(() => {}); showError(e); } }
}
function showChoice() {
  mode = "choice"; $("storyStatus").hidden = true; $("choice").hidden = false;
  $("suggestions").replaceChildren();
  for (const text of floor().suggestions) {
    const b=document.createElement("button"); b.className="chip"; b.type="button"; b.textContent=text;
    b.onclick=()=>sendInstruction(text); $("suggestions").append(b);
  }
  $("instruction").value = ""; $("instruction").focus(); setLine("What shall we do now?"); status("your turn");
}
async function sendInstruction(text) {
  if (mode !== "choice" || !text.trim()) return; mode="busy"; $("choice").hidden=true;
  try { saveJourney(await api(`/api/journey/${journey.id}/instruction`, { instruction: text })); await drive(); }
  catch(e) { showError(e); }
}
$("instructionForm").onsubmit = e => { e.preventDefault(); sendInstruction($("instruction").value); };
$("storyRetry").onclick = async () => {
  if (mode !== "error") return; mode="busy";
  try { saveJourney(await api(`/api/journey/${journey.id}`)); await drive(); } catch(e) { showError(e); }
};

function showQuest() {
  mode="quest"; $("gradeStamp").hidden=true; $("storyStatus").hidden=true; $("reward").hidden=true; $("questTitle").textContent=`${guide()} needs a little help`; $("submitPhoto").textContent=`show ${guide()}`; $("quest").classList.remove("typing"); $("answerForm").hidden=true; $("spokenAnswer").value="";
  $("questText").textContent=floor().needShort || floor().quest.task;
  $("questPreview").hidden=!(journey.rehearsal??journey.preview); $("verdict").textContent=""; resetPhoto();
  $("skipPhoto").hidden = !CONFIG.demo;
  if (!$("quest").open) $("quest").showModal(); status("a quest in your world");
  setLine(`${guide()} is waiting for your find.`);
}
function stopCamera() {
  cameraStream?.getTracks().forEach(t=>t.stop()); cameraStream=null; $("cameraView").srcObject=null; $("cameraArea").hidden=true; $("quest").classList.remove("camera-ready");
}
function resetPhoto() { photo=null; $("shot").removeAttribute("src"); $("shot").classList.remove("on"); $("quest").classList.remove("has-photo"); $("submitPhoto").hidden=true; $("retakePhoto").hidden=true; }
async function openCamera() {
  if(mode!=="quest") return;
  $("quest").classList.remove("typing");$("answerForm").hidden=true;stopCamera(); resetPhoto(); $("verdict").textContent="";
  const id=generation;
  try {
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
    const stream=await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio:false });
    if(!sameVisit(id)||mode!=="quest"||!$("quest").open) { stream.getTracks().forEach(t=>t.stop()); return; }
    cameraStream=stream; $("cameraView").srcObject=stream; $("cameraArea").hidden=false;
    await $("cameraView").play(); $("quest").classList.add("camera-ready"); $("takePhoto").focus();
  } catch { stopCamera(); $("verdict").textContent="Camera access is unavailable. Allow it in your browser, or choose a photo below."; }
}
$("openCam").onclick=openCamera; $("retakePhoto").onclick=openCamera;
$("choosePhoto").onclick=()=>$("camInput").click();
$("cancelCamera").onclick=stopCamera;
$("takePhoto").onclick=()=>{
  const v=$("cameraView"); if(!v.videoWidth) return;
  const c=document.createElement("canvas"), scale=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight));
  c.width=Math.round(v.videoWidth*scale); c.height=Math.round(v.videoHeight*scale); c.getContext("2d").drawImage(v,0,0,c.width,c.height);
  showPhoto(c.toDataURL("image/jpeg",0.88)); stopCamera();
};
function showPhoto(data) { photo=data; $("shot").src=data; $("shot").classList.add("on"); $("quest").classList.add("has-photo"); $("submitPhoto").hidden=false; $("retakePhoto").hidden=false; }
$("camInput").onchange=async e=>{
  const file=e.target.files[0]; e.target.value=""; if(!file || mode!=="quest") return;
  const id=generation;
  try {
    if(file.size>20*1024*1024) throw new Error("Choose a photo under 20 MB.");
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo.");
    const img=new Image(), url=URL.createObjectURL(file);
    try { img.src=url; await img.decode(); if(!sameVisit(id)||mode!=="quest") return;
      const scale=Math.min(1,1280/Math.max(img.width,img.height)), c=document.createElement("canvas");
      c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale); c.getContext("2d").drawImage(img,0,0,c.width,c.height); stopCamera(); showPhoto(c.toDataURL("image/jpeg",0.88));
    } finally { URL.revokeObjectURL(url); }
  } catch(error) { $("verdict").textContent=error.message || "That photo could not be opened. Try another."; }
};
async function submitEvidence(evidence){
  if(mode!=="quest") return; mode="grading"; $("submitPhoto").disabled=true;$("submitAnswer").disabled=true; $("verdict").textContent=`${guide()} is looking closely…`;
  const id=generation;
  try {
    const result=await api("/api/grade",{journeyId:journey.id,...evidence}); if(!sameVisit(id))return;
    try { sessionStorage.setItem("uo_evidence",JSON.stringify({visit:journey.id,photo:result.flag?null:evidence.image,answer:result.flag?null:evidence.answer})); }catch{}
    if(rewardUrl)URL.revokeObjectURL(rewardUrl);rewardUrl=null;
    saveJourney(result.journey);photo=null;stopCamera();$("quest").close();resetPhoto(); await drive(id);
  } catch(e) { if(sameVisit(id)){mode="quest"; $("verdict").textContent=e.message;} }
  finally { $("submitPhoto").disabled=false;$("submitAnswer").disabled=false; }
}
$("submitPhoto").onclick=()=>{if(photo)submitEvidence({image:photo});};
$("typeAnswer").onclick=()=>{if(mode!=="quest")return;stopCamera();resetPhoto();$("quest").classList.add("typing");$("answerForm").hidden=false;$("spokenAnswer").focus();};
$("answerForm").onsubmit=e=>{e.preventDefault();const answer=$("spokenAnswer").value.trim();if(answer)submitEvidence({answer});};
$("quest").addEventListener("close",stopCamera);
$("quest").addEventListener("cancel",e=>{e.preventDefault(); if(mode!=="grading") {$("quest").close(); $("resumeQuest").hidden=false;} });
$("questLater").onclick=()=>{if(mode!=="grading"){stopCamera(); $("quest").close(); $("resumeQuest").hidden=false;}};
$("skipPhoto").onclick=async()=>{
  if(mode!=="quest"||!CONFIG.demo)return;
  mode="busy";const id=generation;stopCamera();
  try {saveJourney(await api(`/api/journey/${journey.id}/demo-complete`,{}));if(!sameVisit(id))return;$("quest").close();resetPhoto();await drive(id);}
  catch(e){if(sameVisit(id)){mode="quest";$("verdict").textContent=e.message;}}
};
$("resumeQuest").onclick=()=>{$("resumeQuest").hidden=true; if(journey?.state==="quest"){showQuest();openCamera();}};

function showReward() { showResult(true); }
function showResult(passed) {
  mode=passed?"reward":"quest"; const r=journey.result;
  if(passed){completedFloors.add(journey.floorId);setPips(completedFloors.size);hotEls[journey.floorId]?.classList.add("lit");}
  $("storyStatus").hidden=true;$("reward").hidden=false;$("reward").scrollTop=0;$("reward").classList.remove("stamped");
  $("gradeStamp").hidden=true;$("resultEvidence").hidden=!r;
  $("resultPhoto").hidden=true;$("resultPhoto").removeAttribute("src");$("resultAnswer").hidden=true;
  try {const evidence=JSON.parse(sessionStorage.getItem("uo_evidence")||"null");if(evidence?.visit===journey.id&&!r?.flag){
    if(evidence.photo){$("resultPhoto").src=evidence.photo;$("resultPhoto").hidden=false;}
    else if(evidence.answer){$("resultAnswer").textContent=evidence.answer;$("resultAnswer").hidden=false;}
  }}catch{}
  $("resultStamp").textContent=r?.grade||"";$("resultStamp").setAttribute("aria-label",`Grade ${r?.grade||""}`);$("resultStamp").removeAttribute("aria-hidden");
  $("resultCharacter").textContent=`${guide()} has spoken${r?.mock?" · preview verdict":""}`;
  $("rewardTitle").textContent=r?.headline || "A little thank-you";
  $("rewardText").textContent=r?.response || floor().quest.reward;
  const demoReward=(journey.rehearsal??journey.preview)||journey.demoCompletion;
  $("rewardStatus").textContent=demoReward?"Preview complete. The result was simulated or skipped; this voice preview uses your browser.":passed?`${r?.evidenceType==="text"?"Answer":"Photo"} checked. Your spoken keepsake is ready.`:"A little more finding to do. You can try again whenever you like.";
  $("playReward").textContent=demoReward?"Hear the preview line":"Hear the verdict again";
  $("retryResult").hidden=passed;$("talkPip").hidden=demoReward||!passed;$("talkPip").disabled=!CONFIG.agent;$("talkPip").textContent=`Talk to ${guide()}`;
  $("agentHelp").textContent=CONFIG.agent&&passed&&!demoReward?`Start a microphone conversation with ${guide()}.`:"";
  $("rewardAudio").hidden=true;$("downloadReward").hidden=true;
  $("chatTranscript").setAttribute("aria-label",`Conversation with ${guide()}`);
  setLine(passed?"A little favour. A very big difference.":"There is always another thing to try.");status(passed?"favour complete":"another little try");
  requestAnimationFrame(()=>$("reward").classList.add("stamped"));
}
$("retryResult").onclick=()=>{if(journey.state==="quest"){showQuest();openCamera();}};
$("playReward").onclick=async()=>{
  if(!["reward","quest"].includes(mode)||!journey.result&&!journey.demoCompletion)return;
  if((journey.rehearsal??journey.preview)||journey.demoCompletion){Audio.unlock(); await Audio.say(journey.result?.response || floor().quest.reward);return;}
  const id=generation; $("playReward").disabled=true;
  try {
    if(!rewardUrl){
      $("rewardStatus").textContent=`${guide()} is recording your verdict…`;
      const r=await fetch(journey.result?.passed?"/api/reward":"/api/speech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({journeyId:journey.id,resultId:journey.result?.id}),signal:controller.signal});
      if(!r.ok)throw new Error((await r.json()).error); const blob=await r.blob(); if(!sameVisit(id))return; rewardUrl=URL.createObjectURL(blob);
    }
    $("rewardAudio").src=rewardUrl; $("rewardAudio").hidden=false;
    $("downloadReward").href=rewardUrl; $("downloadReward").download=`${journey.floorId}-verdict.mp3`; $("downloadReward").hidden=!journey.result?.passed;
    $("rewardStatus").textContent=journey.result?.passed?"Your spoken keepsake. Play it again or save it.":"Your guide’s verdict. There is always another try.";
    await $("rewardAudio").play().catch(()=>{$("rewardStatus").textContent="Tap the audio player's play button to hear your keepsake.";});
  }catch(e){if(sameVisit(id))$("rewardStatus").textContent=e.message;}
  finally{$("playReward").disabled=false;}
};
$("talkPip").onclick=async()=>{
  if(conversation)return stopChat(); if(mode!=="reward")return;
  const id=generation; $("talkPip").disabled=true;
  try {
    $("rewardAudio").pause(); stopSpeech();
    const permission=await navigator.mediaDevices.getUserMedia({audio:true});permission.getTracks().forEach(t=>t.stop());
    if(!sameVisit(id))return;
    const auth=await api("/api/agent-session",{journeyId:journey.id});
    const {Conversation}=await import("/vendor/providers.js");
    const active=await Conversation.startSession({signedUrl:auth.signedUrl,connectionType:"websocket",dynamicVariables:auth.dynamicVariables,
      onMessage:message=>{if(sameVisit(id)){const p=document.createElement("p");p.textContent=`${message.source==="user"?"You":guide()}: ${message.message}`;$("chatTranscript").append(p);while($("chatTranscript").children.length>30)$("chatTranscript").firstChild.remove();$("chatTranscript").scrollTop=$("chatTranscript").scrollHeight;}},
      onDisconnect:()=>{if(sameVisit(id)){conversation=null;clearTimeout(chatTimer);$("talkPip").textContent=journey?`Talk to ${guide()}`:"Talk to your guide";$("agentHelp").textContent="Conversation ended. The microphone is off.";}},
      onError:()=>{if(sameVisit(id)){$("agentHelp").textContent="The voice connection was lost. You can try again.";stopChat().catch(()=>{});}}
    });
    if(!sameVisit(id)){await active.endSession();return;}
    conversation=active;$("talkPip").textContent="End conversation";$("agentHelp").textContent=`Microphone on · talking with ${guide()}`;
    chatTimer=setTimeout(()=>stopChat().catch(()=>{}),180000);
  }catch(e){if(sameVisit(id))$("agentHelp").textContent=`Could not start the conversation: ${e.message}`;}
  finally{$("talkPip").disabled=!CONFIG.agent;}
};
async function stopChat(){clearTimeout(chatTimer);const c=conversation;conversation=null;if(c)await c.endSession();$("talkPip").textContent=journey?`Talk to ${guide()}`:"Talk to your guide";}
$("unmuteVideo").onclick=async()=>{try{await world?.audio?.play();$("unmuteVideo").hidden=true;}catch{setLine("Tap again to enable the scene's sound.");}};

async function backToLift() {
  if(!journey)return;
  const old=journey; generation++;controller?.abort();controller=null;journey=null;storage.set(null);try{sessionStorage.removeItem("uo_evidence");}catch{}mode="busy";
  stopCamera();stopSpeech();await stopChat().catch(()=>{});$("rewardAudio").pause();$("rewardAudio").removeAttribute("src");
  if(rewardUrl)URL.revokeObjectURL(rewardUrl);rewardUrl=null;
  if(dialogueUrl)URL.revokeObjectURL(dialogueUrl);dialogueUrl=null; dialogueAudio.removeAttribute("src");
  $("rewardAudio").hidden=true;$("downloadReward").hidden=true;$("chatTranscript").replaceChildren();resetPhoto();
  if($("quest").open)$("quest").close();
  for(const id of ["choice","reward","storyStatus","resumeQuest","stepIn","floorName","unmuteVideo","gradeStamp","playDialogue","voiceNotice"])$(id).hidden=true;
  $("transit").classList.remove("on");$("dial").classList.remove("shake");setPanelActive(false);setPanelZoom(false);
  const previousWorld=world;world=null;
  await Promise.all([previousWorld?.end().catch(()=>{}),LiftMotion.returnToPanel()]);
  fetch(`/api/journey/${old.id}`,{method:"DELETE"}).catch(()=>{});
  $("previewPip").hidden=true;for(const el of Object.values(hotEls))el.classList.remove("on");
  $("floorMenu").hidden=false;$("liveBtn").hidden=false;mode="idle";setPanelActive(true);
  setLine("Back in the lift. Where shall we go next?");status("choose a floor");
}
$("stepIn").onclick=backToLift;
$("liveBtn").onclick=()=>$("drawer").classList.add("open");$("closeDrawer").onclick=()=>$("drawer").classList.remove("open");
$("useLive").onclick=()=>{if(mode!=="idle"||!CONFIG.live)return;preview=false;rehearsal=false;status("choose a floor");$("drawer").classList.remove("open");};
$("useMock").onclick=()=>{if(mode!=="idle")return;preview=true;rehearsal=true;status("choose a floor");$("drawer").classList.remove("open");};
$("useIllustrated").onclick=()=>{if(mode!=="idle"||CONFIG.grader==="unavailable")return;preview=true;rehearsal=false;status("choose a floor");$("drawer").classList.remove("open");};
async function finale(){if(completedFloors.size<3){setLine("Help three factory friends, then press Up and Out.");return;}setLine("Up and out. A pocketful of strange places, and a factory full of friends.");await Audio.say("Going up. Past the roof. Past the weather. Until next time.");}
addEventListener("pagehide",()=>{controller?.abort();LiftMotion.reset();stopCamera();stopSpeech();stopChat().catch(()=>{});world?.end().catch(()=>{});});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stopCamera();stopChat().catch(()=>{});if(mode==="choice"||mode==="quest"||mode==="reward")world?.disconnect().catch(()=>{});}});
function tick(){needle+=(needleTarget-needle)*.04;$("needle").setAttribute("transform",`rotate(${needle} 180 92)`);requestAnimationFrame(tick);}tick();
