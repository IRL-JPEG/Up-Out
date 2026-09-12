const assert=require('node:assert/strict');
const {setup,openLift,visitChocolate,reachCamera}=require('./browser-helpers.cjs');
(async()=>{
 const h=await setup(),{page}=h;
 try{
  await openLift(page,h.base);
  // Real decoded frames from an explicitly synthetic local video. No provider calls.
  await page.evaluate(()=>{
   const original=PreviewWorld.prototype.play;
   PreviewWorld.prototype.play=async function(speak){
    if(this.plan.beat!=='reunion')return original.call(this,speak);
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=854;
    const ctx=canvas.getContext('2d'),start=performance.now();
    const background=new Image();background.src=this.floor.references[1];await background.decode();
    const paint=()=>{ctx.drawImage(background,0,0,480,854);ctx.fillStyle='#188eca';ctx.fillRect(70+(performance.now()-start)/18%230,530,90,110);ctx.fillStyle='white';ctx.font='22px sans-serif';ctx.fillText('TEST VIDEO '+((performance.now()-start)/1000).toFixed(1),25,50);};
    paint();const timer=setInterval(paint,33),video=document.createElement('video');video.muted=true;video.playsInline=true;
    const stream=canvas.captureStream(30);video.srcObject=stream;await video.play();
    const w=new ReactorWorld('fixture');w.video=video;w.plan={...this.plan,seconds:2.4};w.readyClip='test-return';w.reactor={};
    w.command=async()=>{queueMicrotask(()=>w.onMessage({type:'clip_started',clip:{clip_id:'test-return'}}));setTimeout(()=>w.onMessage({type:'clip_finished',clip:{clip_id:'test-return'}}),2400);};
    try{await w.play(speak);this.responseFrames=w.responseFrames;}
    finally{clearInterval(timer);clearTimeout(w.idleTimer);video.pause();stream.getTracks().forEach(t=>t.stop());}
   };
  });
  await visitChocolate(page);await reachCamera(page);await page.locator('#takePhoto').click();await page.locator('#submitPhoto').click();
  await page.locator('#reward').waitFor({state:'visible'});
  assert.equal(await page.locator('.video-memory').count(),6);
  assert.equal(await page.locator('#resultSlides .result-slide').count(),7);
  assert.equal(await page.locator('#memoryPosition').innerText(),'1 / 7');
  const frames=await page.evaluate(()=>VerdictMoments.read(journey.id,journey.result.id));
  assert.equal(new Set(frames.map(f=>f.image)).size,6);assert.ok(frames.at(-1).time>2);
  for(let i=1;i<6;i++)assert.ok(Math.abs(frames[i].time-frames[i-1].time-frames.at(-1).time/5)<.16);
  await page.locator('#memoryNext').click();await page.waitForFunction(()=>document.querySelector('#memoryPosition').textContent==='2 / 7');
  await page.locator('#resultSlides').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#memoryPosition').textContent==='3 / 7');
  await page.locator('#memoryDots button').last().click();await page.waitForFunction(()=>document.querySelector('#memoryPosition').textContent==='7 / 7');
  await page.waitForFunction(()=>{const el=document.querySelector('#resultSlides');return el.scrollLeft+el.clientWidth>=el.scrollWidth-1;});
  assert.equal(await page.locator('#memoryNext').isDisabled(),true);
  await page.screenshot({path:'artifacts/verdict-video-memories-mobile.png'});
  await page.locator('#playReward').click();assert.ok((await page.evaluate(()=>window.__spoken)).length>1);
  await page.reload();await page.locator('#iris').click();await page.locator('#reward').waitFor({state:'visible'});
  assert.equal(await page.locator('.video-memory').count(),6);assert.equal(await page.locator('#memoryPosition').innerText(),'1 / 7');
  await page.locator('#stepIn').click();await page.waitForFunction(()=>mode==='idle');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('uo_moments')),null);
  assert.equal(await page.locator('.video-memory').count(),0);assert.deepEqual(h.errors,[]);
  console.log('PASS: real decoded synthetic video frames, six evenly spaced snapshots, photo + six-slide carousel, keyboard/buttons, audio replay, reload and exit cleanup. No paid providers.');
 }finally{await h.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
