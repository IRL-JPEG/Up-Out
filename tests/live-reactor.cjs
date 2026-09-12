// Explicit opt-in live probe: one visit, three short clips, no reward-provider calls.
const {chromium}=require("playwright"),fs=require("node:fs");
(async()=>{
  if(process.env.LIVE_REACTOR_TEST!=="1")throw new Error("Set LIVE_REACTOR_TEST=1 to run a billed Reactor video check.");
  fs.mkdirSync("artifacts",{recursive:true});
  const browser=await chromium.launch({channel:"chrome",headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const events=[],errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto("http://localhost:3100");await page.locator("#iris").click();await page.waitForFunction(()=>mode==="idle");
    await page.locator("#liveBtn").click();await page.locator("#useLive").click();
    await page.locator("#floorMenu").click();await page.getByRole("button",{name:"Coconut Ice Rink",exact:true}).last().click();
    let instructed=false,finished=false;
    for(let i=0;i<90;i++){
      await page.waitForTimeout(5000);
      const snapshot=await page.evaluate(()=>{
        if(world?.reactor&&!world._probeAttached){world._probeAttached=true;window._liveEvents=[];world.reactor.on("message",message=>{
          const m={...message,...message.data};window._liveEvents.push({type:m.type,keys:Object.keys(m),clip_id:m.clip?.clip_id||m.clip_id,metadata:m.clip?.metadata,reason:m.reason,canvas:m.canvas});
        });}
        return {mode,state:journey?.state,error:document.querySelector("#storyError").textContent,status:document.querySelector("#state").textContent,command:world?.lastCommand,diagnostics:world?.diagnostics?.splice(0)||[],events:window._liveEvents?.splice(0)||[],video:world?.video?{width:world.video.videoWidth,height:world.video.videoHeight,ready:world.video.readyState}:null};
      });
      events.push(...snapshot.events);delete snapshot.events;console.log(JSON.stringify(snapshot));
      if(snapshot.mode==="error")throw new Error(snapshot.error);
      if(snapshot.state==="choice"&&!instructed){
        await page.screenshot({path:"artifacts/live-tour-mobile.png"});
        await page.locator("#instruction").fill("Skate toward the coconut hut");await page.locator("#instructionForm button").click();instructed=true;
      }
      if(snapshot.state==="quest"){
        await page.screenshot({path:"artifacts/live-camera-handoff-mobile.png"});finished=true;break;
      }
    }
    if(!finished)throw new Error("Live journey did not reach the camera within the probe deadline.");
    if(errors.length)throw new Error(errors.join("; "));
    console.log("PASS: live Reactor tour, instruction, spoken encounter and frozen camera handoff.");
  }finally{
    fs.writeFileSync("artifacts/live-reactor-events.json",JSON.stringify({events,errors},null,2));
    await page.evaluate(async()=>{if(typeof world!=="undefined")await world?.end();}).catch(()=>{});
    await browser.close();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
