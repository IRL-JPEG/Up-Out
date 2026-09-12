const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createApp}=require('../server/api');
(async()=>{
 let checks=0;const server=createApp({grade:async()=>({grade:++checks===1?'F':'A',provenance:'real_world',observedObject:checks===1?'a red mitten':'a silver spoon',visualDetails:'held in a hand',mock:true})}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']});
 await context.addInitScript(()=>{window.speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),25);});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.locator('#iris').click();await page.waitForFunction(()=>mode==='idle');
  await page.locator('#floorMenu').click();await page.getByRole('button',{name:'Coconut Ice Rink',exact:true}).last().click();
  await page.locator('#choice').waitFor({state:'visible'});await page.locator('#instruction').fill('forward');await page.locator('#instructionForm button').click();
  for(const grade of ['F','A']){
   await page.waitForFunction(()=>document.querySelector('#quest').classList.contains('camera-ready'));
   await page.locator('#takePhoto').click();await page.locator('#submitPhoto').click();
   await page.locator('#gradeStamp').waitFor({state:'visible'});assert.equal(await page.locator('#gradeValue').innerText(),grade);
   if(grade==='F'){
    assert.equal(await page.evaluate(()=>journey.state),'quest');assert.equal(await page.locator('#reward').isVisible(),false);
    await page.screenshot({path:'artifacts/retry-grade-mobile.png'});
    await page.reload();await page.locator('#iris').click();await page.locator('#gradeStamp').waitFor({state:'visible'});
    assert.equal(await page.locator('#gradeValue').innerText(),'F');await page.locator('#resumeQuest').click();
   }
  }
  await page.locator('#reward').waitFor({state:'visible'});await page.screenshot({path:'artifacts/graded-reward-mobile.png'});
  assert.equal(checks,2);assert.deepEqual(errors,[]);console.log('PASS: failed photo response, grade stamp, reload, retry and successful response on mobile (injected grading fixtures).');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
