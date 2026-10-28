import {validate} from './starweave-model.js';

// The accepted chime/pluck/hum synthesis, now through the shared sound mixer.
// Only a short horizon is scheduled. Every harmonic and future source is owned.
export class SpellAudio {
  constructor(context,output=context.destination,clock=globalThis) {
    this.context=context; this.output=output; this.clock=clock;
    this.voices=new Set(); this.playing=false; this.timer=null;
  }
  voice(frequency,at,length,type,volume) {
    const c=this.context,o=c.createOscillator(),g=c.createGain();
    o.type=type; o.frequency.value=frequency;
    g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(volume,at+.015);
    g.gain.exponentialRampToValueAtTime(Math.max(.001,volume*.22),at+length*.65);
    g.gain.linearRampToValueAtTime(0,at+length);
    o.connect(g);g.connect(this.output);
    const v={o,g};this.voices.add(v);
    o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(v);};
    o.start(at);o.stop(at+length+.01);
  }
  note(note,at,length) {
    const f=440*2**((note.pitch-69)/12);
    if(note.rune==='ember'){this.voice(f,at,length,'triangle',.11);this.voice(f*2,at,Math.min(.1,length),'sine',.035);}
    else if(note.rune==='moon'){this.voice(f,at,length,'sine',.105);this.voice(f*1.004,at,length,'sine',.04);}
    else{this.voice(f,at,Math.max(.12,length),'sine',.105);this.voice(f*2.76,at,Math.max(.1,length*.65),'sine',.035);}
  }
  start(pattern,onEnd=()=>{}) {
    this.stop();const p=validate(pattern),c=this.context;
    this.moment=60/p.tempo/4;this.total=p.bars*16;this.duration=this.moment*this.total;
    this.started=c.currentTime+.06;this.playing=true;
    let cycle=0,index=0,last=c.currentTime;
    const tick=()=>{
      if(!this.playing)return;
      const now=c.currentTime;
      if((c.state && c.state!=='running') || now-last>.5){this.stop();onEnd('interrupted');return;}
      last=now;
      if(!p.loop && now>=this.started+this.duration){this.stop();onEnd('complete');return;}
      if(!p.notes.length)return;
      while(this.playing){
        if(index===p.notes.length){if(!p.loop)break;index=0;cycle++;}
        const n=p.notes[index],at=this.started+cycle*this.duration+n.start*this.moment;
        if(at>now+.15)break;
        // A delayed callback may skip an expired attack, never replay a burst.
        if(at>=now-.025)this.note(n,Math.max(at,now),n.duration*this.moment*.94);
        index++;
      }
    };
    try{tick();this.timer=this.clock.setInterval(tick,25);}catch(err){this.stop();throw err;}
  }
  get position(){return this.playing?Math.max(0,(this.context.currentTime-this.started)/this.moment)%this.total:-1;}
  get step(){return this.playing?Math.floor(this.position):-1;}
  stop(){
    if(this.timer!==null)this.clock.clearInterval(this.timer);
    this.timer=null;this.playing=false;
    for(const {o,g} of this.voices){o.onended=null;try{o.stop();}catch{}o.disconnect();g.disconnect();}
    this.voices.clear();
  }
}

// Resume is asynchronous on real browsers. A cancelled activation cannot start
// later after mute, edits, blur, minimisation, unmount or another Play request.
export class Playback {
  constructor(acquire,allowed,onStop=()=>{}) { this.acquire=acquire;this.allowed=allowed;this.onStop=onStop;this.generation=0;this.audio=null;this.pending=false;this.release=null; }
  async start(pattern) {
    this.stop();const generation=this.generation;this.pending=true;
    try{
      if(!this.allowed())throw new Error('Turn on sound and focus Starweave before casting.');
      const channel=this.acquire();if(!channel)throw new Error('Audio is unavailable. Your spell can still be edited and exported.');
      const {context,output}=channel;
      await context.resume();
      if(generation!==this.generation)return false;
      if(!this.allowed() || context.state!=='running')throw new Error('Audio did not start. Cast again when sound is available.');
      this.audio=new SpellAudio(context,output);
      const state=()=>{if(context.state!=='running')this.stop('Audio interrupted. Cast again to resume.');};
      context.addEventListener('statechange',state);
      this.release=()=>context.removeEventListener('statechange',state);
      this.audio.start(pattern,reason=>this.stop(reason==='complete'?'The spell is complete.':'Audio interrupted. Cast again to resume.'));
      this.pending=false;return true;
    }catch(err){if(generation!==this.generation)return false;this.stop();throw err;}
  }
  stop(message){this.generation++;this.pending=false;this.release?.();this.release=null;this.audio?.stop();this.audio=null;this.onStop(message);}
}
