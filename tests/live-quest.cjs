// Explicit, bounded live provider check: no Reactor session is opened.
if(process.env.LIVE_QUEST_TEST!=='1')throw new Error('Set LIVE_QUEST_TEST=1 to run the paid provider check.');
require('dotenv').config();
const fs=require('node:fs'),assert=require('node:assert/strict'),{createApp}=require('../server/api');
(async()=>{
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;let cookie;
 const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});cookie ||=r.headers.get('set-cookie')?.split(';')[0];if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r;};
 const json=async(path,body)=>(await post(path,body)).json();
 try{
  const j=await json('/api/journey',{floorId:'chocolate-room',preview:true,rehearsal:false});assert.equal(j.rehearsal,false);
  const finish=async()=>{const p=await json(`/api/journey/${j.id}/clip`,{});return json(`/api/journey/${j.id}/complete`,{playbackId:p.playbackId});};
  await finish();await json(`/api/journey/${j.id}/instruction`,{instruction:'Look left'});await finish();await finish();
  const evidence=[{image:'data:image/png;base64,'+fs.readFileSync('public/assets/rooms/chocolate-room-arrival.png').toString('base64')},{answer:'I found a real blue watering can with a long spout. I can tip it to pour water into a cup.'}];
  const results=[];
  for(let i=0;i<evidence.length;i++){
   const result=await json('/api/grade',{journeyId:j.id,...evidence[i]});
   assert.equal(result.mock,false);if(i===0){assert.ok(['C','D','F'].includes(result.grade));assert.equal(result.passed,false);}else{assert.equal(result.grade,'A');assert.equal(result.evidenceType,'text');assert.equal(result.passed,true);assert.equal(result.photoVerified,false);}
   const clip=await json(`/api/journey/${j.id}/clip`,{});assert.ok(clip.prompt.includes(JSON.stringify(result.response)));assert.ok(clip.prompt.includes(result.observedObject));
   const audio=Buffer.from(await(await post('/api/speech',{journeyId:j.id,resultId:result.id})).arrayBuffer());assert.ok(audio.length>1000);
   fs.writeFileSync(`artifacts/live-${i?'success':'retry'}-verdict.mp3`,audio);
   const complete=await json(`/api/journey/${j.id}/complete`,{playbackId:clip.playbackId});assert.equal(complete.state,i?'reward':'quest');
   const replay=Buffer.from(await(await post(i?'/api/reward':'/api/speech',{journeyId:j.id,resultId:result.id})).arrayBuffer());assert.ok(audio.equals(replay));
   results.push({grade:result.grade,headline:result.headline,evidenceType:result.evidenceType,provenance:result.provenance,observedObject:result.observedObject,response:result.response,audioBytes:audio.length,finalState:complete.state});
  }
  fs.writeFileSync('artifacts/live-quest-results.json',JSON.stringify(results,null,2));console.log('PASS: live illustration rejection, typed A, fresh rhyming replies, constructed video prompts, ElevenLabs recordings, cached replays and gated keepsake.');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
