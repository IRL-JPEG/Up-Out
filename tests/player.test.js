const test=require("node:test"),assert=require("node:assert/strict");
const {ReactorWorld}=require("../public/js/player");
test("H3 waits for clip_generated and maps ordered upload ids",async()=>{
  const w=new ReactorWorld("test");const sent=[];
  w.connect=async()=>{};w.validCommands=["enqueue"];
  w.references.set("arrival",{upload_id:"one"});w.references.set("encounter",{upload_id:"two"});
  w.reactor={sendCommand:async(name,data)=>{sent.push({name,data});return {clip:{clip_id:"queued"}};}};
  let ready=false;const pending=w.prepare({beat:"ask",playbackId:"beat-id",references:["arrival","encounter"],prompt:"hi",seconds:15}).then(()=>{ready=true;});
  await new Promise(r=>setImmediate(r));assert.equal(ready,false);
  w.onMessage({type:"clip_generated",data:{clip:{metadata:"unrelated",clip_id:"wrong"}}});assert.equal(ready,false);
  w.onMessage({type:"clip_generated",data:{clip:{metadata:"beat-id",clip_id:"right"}}});await pending;
  assert.equal(w.readyClip,"right");assert.deepEqual(sent[0].data.reference_images,[{upload_id:"one"},{upload_id:"two"}]);
});
test("a clip failure cannot become successful playback",async()=>{
  const w=new ReactorWorld("test");w.plan={playbackId:"beat"};
  const pending=w.event(m=>m.type==="clip_finished",1000,"timed out");
  w.onMessage({type:"clip_failed",data:{clip:{metadata:"beat"},reason:"generation failed"}});
  await assert.rejects(pending,/generation failed/);assert.equal(w.waiters.size,0);
});
test("command errors and disconnects clear every pending wait",async()=>{
  const w=new ReactorWorld("test"),a=w.event(()=>false,1000,"timeout"),b=w.event(()=>false,1000,"timeout");
  w.onMessage({type:"command_error",data:{reason:"queue full"}});
  await assert.rejects(a,/queue full/);await assert.rejects(b,/queue full/);assert.equal(w.waiters.size,0);
});

test('character playback starts external speech on clip start and waits for its end',async()=>{
 const w=new ReactorWorld('sync');w.readyClip='clip';let held=false,done=false,resolveSpeech,signalStarted;
 global.$=()=>({replaceChildren(){},hidden:true});w.video={play:async()=>{}};w.holdFrame=()=>{held=true;};
 w.command=async()=>{setImmediate(()=>w.onMessage({type:'clip_started',clip:{clip_id:'clip'}}));};
 const speech=new Promise(r=>{resolveSpeech=r;}),speechStarted=new Promise(r=>{signalStarted=r;});
 const playing=w.play(()=>{signalStarted();return speech;}).then(()=>{done=true;});
 try {
  await require('../public/js/player').deadline(speechStarted,2000,'Speech did not start');assert.equal(done,false);
  w.onMessage({type:'clip_finished',clip:{clip_id:'clip'}});
  await new Promise(r=>setImmediate(r));assert.equal(held,true);assert.equal(done,false);
  resolveSpeech();await playing;assert.equal(done,true);
 }finally{resolveSpeech();w.rejectAll(new Error('Test cleanup'));await playing.catch(()=>{});clearTimeout(w.idleTimer);delete global.$;}
});
