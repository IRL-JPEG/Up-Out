/* Keep actual decoded frames from the return video, never generated substitutes. */
(function(root){
  function selectMoments(frames, count=6){
    if(frames.length<=count)return frames.slice();
    const first=frames[0].time,last=frames.at(-1).time,selected=[];
    let previous=-1;
    for(let i=0;i<count;i++){
      const target=first+(last-first)*i/(count-1);
      let best=previous+1;
      const limit=frames.length-(count-i);
      for(let j=best+1;j<=limit;j++)if(Math.abs(frames[j].time-target)<Math.abs(frames[best].time-target))best=j;
      selected.push(frames[best]);previous=best;
    }
    return selected;
  }
  class Capture {
    constructor(video,seconds=15){this.video=video;this.interval=Math.max(.1,(Number(seconds)||15)/60);this.frames=[];this.active=false;}
    start(){this.active=true;this.schedule();return this;}
    schedule(){
      if(!this.active)return;
      if(this.video.requestVideoFrameCallback){this.frameRequest=true;this.handle=this.video.requestVideoFrameCallback((_,metadata)=>{this.sample(metadata.mediaTime);this.schedule();});}
      else {this.frameRequest=false;this.handle=requestAnimationFrame(()=>{this.sample(this.video.currentTime);this.schedule();});}
    }
    sample(time){
      if(!this.active||this.video.readyState<2||!this.video.videoWidth||!Number.isFinite(time))return;
      this.origin??=time;const elapsed=time-this.origin;
      if(elapsed<0||this.frames.length&&elapsed-this.frames.at(-1).time<this.interval)return;
      try{
        this.canvas??=document.createElement('canvas');
        const scale=Math.min(1,480/this.video.videoWidth,854/this.video.videoHeight);
        this.canvas.width=Math.round(this.video.videoWidth*scale);this.canvas.height=Math.round(this.video.videoHeight*scale);
        this.canvas.getContext('2d').drawImage(this.video,0,0,this.canvas.width,this.canvas.height);
        this.frames.push({time:elapsed,image:this.canvas.toDataURL('image/jpeg',.76)});
        if(this.frames.length>=96){this.frames=this.frames.filter((_,i)=>i%2===0);this.interval*=2;}
      }catch{this.cancel();}
    }
    stop(){
      this.active=false;
      if(this.handle!==undefined){if(this.frameRequest)this.video.cancelVideoFrameCallback?.(this.handle);else cancelAnimationFrame(this.handle);}
      this.canvas=null;
    }
    finish(){this.stop();const result=selectMoments(this.frames);this.frames=[];return result;}
    cancel(){this.stop();this.frames=[];}
  }
  let saved=null;
  function clear(){saved=null;try{sessionStorage.removeItem('uo_moments');}catch{}}
  function save(visit,result,frames){
    clear();if(!frames?.length)return;
    saved={visit,result,frames:selectMoments(frames)};
    try{sessionStorage.setItem('uo_moments',JSON.stringify(saved));}catch{}
  }
  function read(visit,result){
    if(!saved)try{saved=JSON.parse(sessionStorage.getItem('uo_moments')||'null');}catch{}
    if(saved?.visit!==visit||saved?.result!==result)return [];
    return (Array.isArray(saved.frames)?saved.frames:[]).filter(f=>Number.isFinite(f.time)&&typeof f.image==='string'&&f.image.startsWith('data:image/jpeg;base64,')).slice(0,6);
  }
  const api={Capture,selectMoments,clear,save,read};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.VerdictMoments=api;
})(typeof globalThis!=='undefined'?globalThis:this);
