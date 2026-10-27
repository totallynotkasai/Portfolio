import {circleEvents} from './spell-music-model.mjs';
// Harmonics and future voices are owned by one cancellable transport.
export class SpellAudio {
  constructor(context){this.context=context;this.voices=new Set();this.playing=false;this.timer=null;}
  voice(frequency,at,length,type,volume){const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.015);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume*.22),at+length*.65);g.gain.linearRampToValueAtTime(0,at+length);o.connect(g);g.connect(c.destination);const v={o,g};this.voices.add(v);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(v);};o.start(at);o.stop(at+length+.01);}
  note(note,at,length){const f=440*2**((note.pitch-69)/12);if(note.rune==='ember'){this.voice(f,at,length,'triangle',.11);this.voice(f*2,at,.1,'sine',.035);}else if(note.rune==='moon'){this.voice(f,at,length,'sine',.105);this.voice(f*1.004,at,length,'sine',.04);}else{this.voice(f,at,Math.max(.12,length),'sine',.105);this.voice(f*2.76,at,Math.max(.1,length*.65),'sine',.035);}}
  start(pattern,bpm,loop=true,onEnd=()=>{}){this.stop();const c=this.context,step=60/bpm/4;this.duration=step*16;this.started=c.currentTime+.06;this.playing=true;let next=this.started;const schedule=()=>{for(const n of circleEvents(pattern))this.note(n,next+n.start*step,n.length*step*.94);next+=this.duration;};schedule();this.timer=setInterval(()=>{if(loop&&next<c.currentTime+.15)schedule();if(!loop&&c.currentTime>=next){this.stop();onEnd();}},25);}
  get step(){return this.playing?Math.floor(Math.max(0,this.context.currentTime-this.started)/this.duration*16)%16:-1;}
  stop(){clearInterval(this.timer);this.timer=null;this.playing=false;for(const {o,g} of this.voices){o.onended=null;try{o.stop();}catch{}o.disconnect();g.disconnect();}this.voices.clear();}
}
