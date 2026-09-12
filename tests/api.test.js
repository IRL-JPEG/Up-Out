const test=require("node:test"),assert=require("node:assert/strict");
const {createApp}=require("../server/api");
test("HTTP journey gates reject bypasses and recover from a failed checker",async()=>{
  let calls=0;
  const app=createApp({grade:async()=>{calls++;throw new Error("provider outage");}});
  const server=app.listen(0,"127.0.0.1"); await new Promise(r=>server.once("listening",r));
  const base=`http://127.0.0.1:${server.address().port}`;
  let cookie;
  const req=async(path,body)=>{
    const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
    cookie ||= r.headers.get("set-cookie")?.split(";")[0];return {status:r.status,data:await r.json()};
  };
  try{
    const start=await req("/api/journey",{floorId:"coconut",preview:true});assert.equal(start.status,200);const id=start.data.id;
    assert.equal((await req("/api/reward",{journeyId:id})).status,403);
    assert.equal((await req("/api/grade",{journeyId:id,image:"not a photo"})).status,409);assert.equal(calls,0);
    for(const beat of ["tour","instruction","ask"]){
      if(beat==="instruction")assert.equal((await req(`/api/journey/${id}/instruction`,{instruction:"skate over there"})).status,200);
      const plan=await req(`/api/journey/${id}/clip`,{});assert.equal(plan.data.beat,beat);
      assert.equal((await req(`/api/journey/${id}/complete`,{playbackId:plan.data.playbackId})).status,200);
    }
    assert.equal((await req("/api/grade",{journeyId:id,image:"photo"})).status,502);
    assert.equal((await req("/api/reward",{journeyId:id})).status,403);
    const state=await fetch(`${base}/api/journey/${id}`,{headers:{Cookie:cookie}});assert.equal((await state.json()).state,"quest");
    const stranger=await fetch(`${base}/api/journey/${id}`);assert.equal(stranger.status,404);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test("demo skip is opt-in, waits for the request, and never grants a real reward",async()=>{
  const prior=process.env.DEMO_MODE;process.env.DEMO_MODE="1";
  const server=createApp().listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
  const base=`http://127.0.0.1:${server.address().port}`;let cookie;
  const req=async(path,body)=>{const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});cookie ||= r.headers.get("set-cookie")?.split(";")[0];return {status:r.status,data:await r.json()};};
  try{
    const {data:j}=await req("/api/journey",{floorId:"mint",preview:true});
    assert.equal((await req(`/api/journey/${j.id}/demo-complete`,{})).status,409);
    for(const beat of ["tour","instruction","ask"]){if(beat==="instruction")await req(`/api/journey/${j.id}/instruction`,{instruction:"walk forward"});const {data:p}=await req(`/api/journey/${j.id}/clip`,{});await req(`/api/journey/${j.id}/complete`,{playbackId:p.playbackId});}
    const skipped=await req(`/api/journey/${j.id}/demo-complete`,{});assert.equal(skipped.data.demoCompletion,true);assert.equal(skipped.data.state,"reunion");
    const {data:p}=await req(`/api/journey/${j.id}/clip`,{});await req(`/api/journey/${j.id}/complete`,{playbackId:p.playbackId});
    assert.equal((await req("/api/reward",{journeyId:j.id})).status,403);
  }finally{if(prior===undefined)delete process.env.DEMO_MODE;else process.env.DEMO_MODE=prior;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
