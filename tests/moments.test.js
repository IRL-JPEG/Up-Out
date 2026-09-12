const test=require('node:test'),assert=require('node:assert/strict');
const {selectMoments,Capture}=require('../public/js/moments');
test('six moments span the actual media timeline including both ends',()=>{
 const frames=Array.from({length:61},(_,i)=>({time:i/4,image:String(i)}));
 assert.deepEqual(selectMoments(frames).map(f=>f.time),[0,3,6,9,12,15]);
 const uneven=frames.filter((_,i)=>i<14||i>23),selected=selectMoments(uneven);
 assert.equal(selected.length,6);assert.equal(new Set(selected).size,6);
 assert.equal(selected[0].time,0);assert.equal(selected.at(-1).time,15);
 assert.deepEqual(selectMoments([]),[]);assert.equal(selectMoments(frames.slice(0,3)).length,3);
});
test('capture uses decoded video time, stays bounded, and cancels frame callbacks',()=>{
 let callback,cancelled=0,drawn=0;
 const video={readyState:2,videoWidth:768,videoHeight:1344,requestVideoFrameCallback(fn){callback=fn;return 7;},cancelVideoFrameCallback(){cancelled++;}};
 global.document={createElement:()=>({getContext:()=>({drawImage:()=>drawn++}),toDataURL:()=>`data:image/jpeg;base64,${drawn}`})};
 try{
  const capture=new Capture(video,15).start();
  for(let i=0;i<500;i++)callback(0,{mediaTime:400+i/4});
  assert.ok(capture.frames.length<96);const frames=capture.finish();
  assert.equal(frames.length,6);assert.equal(frames[0].time,0);assert.ok(frames.at(-1).time>115);
  assert.equal(cancelled,1);assert.equal(capture.frames.length,0);assert.equal(capture.active,false);
  const aborted=new Capture(video).start();callback(0,{mediaTime:900});aborted.cancel();assert.deepEqual(aborted.finish(),[]);
 }finally{delete global.document;}
});
