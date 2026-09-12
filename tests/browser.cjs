const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
(async()=>{
  fs.mkdirSync("artifacts",{recursive:true});
  const browser=await chromium.launch({channel:"chrome",headless:true,args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:["camera","microphone"]});
  // Fast speech completion is a test fixture, not a change to story state.
  await context.addInitScript(()=>{window.speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),25);});
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto("http://localhost:3100");await page.locator("#iris").click();
    await page.waitForFunction(()=>mode==="idle");
    await page.locator("#liveBtn").click();await page.locator("#useMock").click();
    await page.locator("#floorMenu").click();await page.screenshot({path:"artifacts/floors-mobile.png"});
    await page.getByRole("button",{name:"Coconut Ice Rink",exact:true}).last().click();
    await page.locator("#choice").waitFor({state:"visible",timeout:30000});
    await page.screenshot({path:"artifacts/coconut-choice-mobile.png"});
    const ratio=await page.locator("#app").evaluate(e=>e.clientWidth/e.clientHeight);assert.ok(Math.abs(ratio-9/16)<.003);
    await page.locator("#instruction").fill("Let's skate over there");await page.locator("#instructionForm button").click();
    await page.waitForFunction(()=>document.querySelector("#quest").open,{},{timeout:30000});
    await page.waitForFunction(()=>document.querySelector("#quest").classList.contains("camera-ready"));
    await page.waitForTimeout(1200);
    await page.screenshot({path:"artifacts/camera-request-mobile.png"});
    assert.equal(await page.evaluate(()=>journey.state),"quest");
    const stream=await page.locator("#cameraView").evaluateHandle(v=>v.srcObject);
    await page.locator("#takePhoto").click();assert.equal(await stream.evaluate(s=>s.getTracks().every(t=>t.readyState==="ended")),true);
    await page.locator("#submitPhoto").click();await page.locator("#reward").waitFor({state:"visible",timeout:20000});
    assert.match(await page.locator("#rewardStatus").innerText(),/simulated/);
    assert.equal(await page.locator("#gradeValue").innerText(),"A");
    assert.equal(await page.locator("#gradeStamp").isVisible(),true);
    await page.screenshot({path:"artifacts/reward-mobile.png"});
    const denied=await page.evaluate(async()=>{const r=await fetch("/api/reward",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({journeyId:journey.id})});return r.status;});assert.equal(denied,403);
    await page.reload();await page.locator("#iris").click();await page.locator("#reward").waitFor({state:"visible",timeout:15000});
    await page.locator("#stepIn").click();await page.waitForFunction(()=>mode==="idle");
    await page.locator("#floorMenu").click();await page.getByRole("button",{name:"Mint Jujubes",exact:true}).last().click();
    await page.locator("#choice").waitFor({state:"visible",timeout:20000});
    await page.locator("#instruction").fill("Look left");await page.locator("#instructionForm button").click();
    await page.waitForFunction(()=>document.querySelector("#quest").open);
    await page.locator("#skipPhoto").click();await page.locator("#reward").waitFor({state:"visible",timeout:15000});
    assert.equal(await page.evaluate(()=>journey.demoCompletion),true);
    await page.locator("#stepIn").click();await page.waitForFunction(()=>mode==="idle");
    assert.deepEqual(errors,[]);console.log("PASS: mobile preview, single instruction, camera crossfade, capture/cleanup, gated reward, reload recovery, second floor and explicit photo skip.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
