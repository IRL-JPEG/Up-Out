// Explicit opt-in live probe: four clips plus one photo verdict and character voice.
const {chromium}=require("playwright"),fs=require("node:fs");
(async()=>{
  if(process.env.LIVE_REACTOR_TEST!=="1")throw new Error("Set LIVE_REACTOR_TEST=1 to run a billed Reactor video check.");
  fs.mkdirSync("artifacts",{recursive:true});
  const browser=await chromium.launch({channel:"chrome",headless:true,args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:["camera"]}),page=await context.newPage();
  const events=[],errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(process.env.TEST_BASE_URL || "http://localhost:3100");
    if(process.env.RESPONSE_ONLY_TEST==="1") await page.evaluate(async()=>{
      const post=async(path,body)=>{const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error("Fixture setup failed");return r.json();};
      const j=await post("/api/journey",{floorId:"chocolate-room",preview:false,rehearsal:false});
      for(const beat of ["tour","instruction","ask"]){if(beat==="instruction")await post(`/api/journey/${j.id}/instruction`,{instruction:"Look left"});const p=await post(`/api/journey/${j.id}/clip`,{});await post(`/api/journey/${j.id}/complete`,{playbackId:p.playbackId});}
      sessionStorage.setItem("uo_visit",j.id);
    });
    await page.locator("#iris").click();
    if(process.env.RESPONSE_ONLY_TEST!=="1"){await page.waitForFunction(()=>mode==="idle");
    await page.locator("#liveBtn").click();await page.locator("#useLive").click();
    await page.locator("#floorMenu").click();await page.getByRole("button",{name:"The Chocolate Room",exact:true}).last().click();}
    let instructed=false,offered=false,finished=false;
    for(let i=0;i<150;i++){
      await page.waitForTimeout(5000);
      const snapshot=await page.evaluate(()=>{
        if(world?.reactor&&!world._probeAttached){world._probeAttached=true;window._liveEvents=[];world.reactor.on("message",message=>{
          const m={...message,...message.data};window._liveEvents.push({type:m.type,keys:Object.keys(m),clip_id:m.clip?.clip_id||m.clip_id,metadata:m.clip?.metadata,reason:m.reason,canvas:m.canvas});
        });}
        return {mode,state:journey?.state,error:document.querySelector("#storyError").textContent,verdict:document.querySelector("#verdict").textContent,result:journey?.result?.grade,status:document.querySelector("#state").textContent,command:world?.lastCommand,diagnostics:world?.diagnostics?.splice(0)||[],events:window._liveEvents?.splice(0)||[],video:world?.video?{width:world.video.videoWidth,height:world.video.videoHeight,ready:world.video.readyState}:null};
      });
      events.push(...snapshot.events);delete snapshot.events;console.log(JSON.stringify(snapshot));
      if(snapshot.mode==="error")throw new Error(snapshot.error);
      if(offered&&snapshot.mode==="quest"&&!snapshot.result&&snapshot.verdict)throw new Error(snapshot.verdict);
      if(snapshot.state==="choice"&&!instructed){
        await page.screenshot({path:"artifacts/live-tour-mobile.png"});
        await page.locator("#instruction").fill("Walk toward the waterfall");await page.locator("#instructionForm button").click();instructed=true;
      }
      if(snapshot.state==="quest"&&!offered){
        await page.screenshot({path:"artifacts/live-camera-handoff-mobile.png"});
        await page.locator("#camInput").setInputFiles("public/assets/rooms/chocolate-room-arrival.png");
        await page.locator("#submitPhoto").click();offered=true;
      } else if(offered&&await page.locator("#reward").isVisible()) {
        await page.screenshot({path:"artifacts/live-video-verdict-mobile.png"});finished=true;break;
      }
    }
    if(!finished)throw new Error("Live journey did not reach the graded verdict within the probe deadline.");
    if(errors.length)throw new Error(errors.join("; "));
    console.log(process.env.RESPONSE_ONLY_TEST === "1" ? "PASS: live photo verdict, ElevenLabs speech, dynamic Reactor return and grade stamp from a prepared quest." : "PASS: live Reactor tour, one instruction, ElevenLabs encounter, frozen camera handoff, real image verdict, dynamic return video and grade stamp.");
  }finally{
    fs.writeFileSync("artifacts/live-reactor-events.json",JSON.stringify({phase:process.env.RESPONSE_ONLY_TEST==="1"?"response":"full",events,errors},null,2));
    await page.evaluate(async()=>{if(typeof world!=="undefined")await world?.end();}).catch(()=>{});
    await browser.close();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
