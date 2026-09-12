const test=require('node:test'),assert=require('node:assert/strict');
const {Journeys}=require('../server/journeys');
const {responseFor}=require('../server/response');
const {floors}=require('../public/js/floors');
const sample=(extra={})=>({grade:'A',flag:false,provenance:'real_world',observedObject:'a blue plastic fork',visualDetails:'three blue prongs, sitting on the table',headline:'A CLEVER LITTLE OFFERING',response:'A blue plastic fork, with three proud prongs! My silly machine has spotted a useful trick, and its wheels are whirling again. Thank you for bringing such a cheerful little thing.\nBlue prongs bright at close of day,\nTurn our sugar wheels to play.',...extra});
const finish=(s,j)=>{const p=s.plan(j);s.complete(j,p.playbackId);return p;};
test('every grade receives a photo-specific response; retries cannot unlock rewards',()=>{
 for(const grade of ['A*','A','B','C','D','F']){
  const s=new Journeys(),j=s.create('owner','coconut',false);j.state='quest';
  const result=s.acceptGrade(j,sample({grade,mock:false}));
  assert.equal(j.state,'reunion');assert.match(result.response,/blue plastic fork/);
  const p=s.plan(j);assert.match(p.prompt,/three blue prongs/);assert.ok(p.prompt.includes(JSON.stringify(result.response)));assert.equal(p.externalVoice,true);assert.equal(p.seconds,15);
  assert.throws(()=>s.acceptGrade(j,result));assert.throws(()=>s.requireReward(j));
  finish(s,j);assert.equal(j.state,['A*','A'].includes(grade)?'reward':'quest');
  if(j.state==='quest')assert.throws(()=>s.requireReward(j));
 }
});
test('screen provenance never gets a congratulatory escape script and tags stay out of captions',()=>{
 const r=responseFor(sample({grade:'C',provenance:'catalogue_or_screen',observedObject:'<b>spoon</b>',visualDetails:'silver',response:'A silver spoon on a screen! It has a bright bowl, but the rink needs a real thing from your room. Something slippery could help another time.\nA little soap another day,\nWill send our sleepy skates away.'}),floors.coconut);
 assert.equal(r.passed,false);assert.match(r.response,/real thing/);assert.ok(!r.response.includes('['));assert.ok(!r.response.includes('<'));assert.ok(r.ttsResponse.includes('['));
});
test('ElevenLabs uses the graded script, caches it, and rejects a stale photo response',async()=>{
 const previous={};for(const k of ['ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID','ELEVENLABS_TTS_MODEL'])previous[k]=process.env[k];
 process.env.ELEVENLABS_API_KEY='test-only';process.env.ELEVENLABS_VOICE_ID='pip-test';process.env.ELEVENLABS_TTS_MODEL='eleven_v3';
 const {createApp}=require('../server/api');const calls=[];
 let checks=0;
 const server=createApp({grade:async()=>{checks++;return sample({grade:'F',observedObject:'a red mitten',visualDetails:'knitted wool',response:'A red mitten, all woolly and warm! It makes my slippery rink a little too cosy, but I like the effort. A bit of soap can help us another time.\nOur sleepy skates can wait today,\nTill something slides them on their way.'});},upstream:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(Buffer.from('test audio'));}}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;let cookie;
 const req=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});cookie ||=r.headers.get('set-cookie')?.split(';')[0];return r;};
 try{
  // The live flag only requires a configured token key; no token call is made in this HTTP test.
  const oldKey=process.env.REACTOR_API_KEY;process.env.REACTOR_API_KEY='test-only';
  const j=await(await req('/api/journey',{floorId:'coconut',preview:false})).json();
  if(oldKey===undefined)delete process.env.REACTOR_API_KEY;else process.env.REACTOR_API_KEY=oldKey;
  for(const beat of ['tour','instruction','ask']){if(beat==='instruction')await req(`/api/journey/${j.id}/instruction`,{instruction:'forward'});const p=await(await req(`/api/journey/${j.id}/clip`,{})).json();await req(`/api/journey/${j.id}/complete`,{playbackId:p.playbackId});}
  const result=await(await req('/api/grade',{journeyId:j.id,image:'fixture handled by injected grader'})).json();
  assert.equal(result.grade,'F');assert.equal(result.journey.result.id,result.id);
  const duplicate=await(await req('/api/grade',{journeyId:j.id,image:'fixture handled by injected grader'})).json();
  assert.equal(duplicate.id,result.id);assert.equal(checks,1);
  assert.equal((await req('/api/speech',{journeyId:j.id,resultId:'stale'})).status,409);
  for(let i=0;i<2;i++)assert.equal((await req('/api/speech',{journeyId:j.id,resultId:result.id})).status,200);
  assert.equal(calls.length,1);assert.equal(calls[0].body.text,result.ttsResponse);assert.match(calls[0].body.text,/red mitten/);
  assert.equal((await req('/api/reward',{journeyId:j.id})).status,403);
  const plan=await(await req(`/api/journey/${j.id}/clip`,{})).json();
  await req(`/api/journey/${j.id}/complete`,{playbackId:plan.playbackId});
  assert.equal((await req('/api/speech',{journeyId:j.id,resultId:result.id})).status,200);assert.equal(calls.length,1);
  const restored=await(await fetch(`${base}/api/journey/${j.id}`,{headers:{Cookie:cookie}})).json();
  assert.equal(restored.result.id,result.id);assert.equal(restored.state,'quest');
 }finally{for(const [k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('the generated reply is retained word for word and flagged content never reaches video',()=>{
 const input=sample();const result=responseFor(input,floors.coconut);
 assert.equal(result.response,input.response);assert.equal(result.ttsResponse.replace(/\[[^\]]*\]\s*/g,'').trim(),input.response);
 const s=new Journeys(),j=s.create('owner','coconut',false);j.state='quest';
 const flagged=s.acceptGrade(j,sample({flag:true,grade:'A*',observedObject:'UNSAFE_OBJECT_SENTINEL',visualDetails:'UNSAFE_DETAIL_SENTINEL',response:'UNSAFE_RESPONSE_SENTINEL'}));
 const plan=s.plan(j);assert.equal(flagged.grade,'F');assert.equal(flagged.passed,false);
 assert.ok(!plan.prompt.includes('UNSAFE_'));assert.match(plan.prompt,/No object appears/);
 finish(s,j);assert.equal(j.state,'quest');assert.throws(()=>s.requireReward(j));
});
test('successful doorman reactions still keep the door shut',()=>{
 const floor=floors['butterscotch-buttergin'];assert.ok(floor);
 const s=new Journeys(),j=s.create('owner',floor.id,false);j.state='quest';s.acceptGrade(j,sample());
 assert.match(s.plan(j).prompt,/door stays shut at every grade/);
});
