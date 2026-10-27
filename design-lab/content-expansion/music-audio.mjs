import {events} from './music-model.mjs';
// One audio-clock transport; every scheduled voice is owned and cancellable.
export class NoteTransport {
  constructor(context) { this.context=context; this.voices=new Set(); this.timer=null; this.playing=false; }
  start(pattern,bpm,loop,onEnd=()=>{}) {
    this.stop();
    const ctx=this.context, step=60/bpm/4, duration=step*16;
    this.started=ctx.currentTime+.06; this.duration=duration; this.playing=true;
    let next=this.started;
    const schedule=()=>{
      if(!this.playing)return;
      if(next<ctx.currentTime+.15) {
        for(const note of events(pattern))this.note(note.pitch,next+note.start*step,note.length*step*.95);
        next+=duration;
      }
      if(!loop && ctx.currentTime>=this.started+duration) { this.stop(); onEnd(); }
    };
    // A whole bar is queued against the audio clock, never animation time.
    for(const note of events(pattern))this.note(note.pitch,next+note.start*step,note.length*step*.95);
    next+=duration;
    this.timer=setInterval(()=> { if(loop)schedule(); else if(ctx.currentTime>=next){this.stop();onEnd();} },25);
  }
  note(pitch,at,length) {
    const ctx=this.context, osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=440*2**((pitch-69)/12);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.14,at+.012);
    gain.gain.exponentialRampToValueAtTime(.07,at+Math.min(.12,length*.6));
    gain.gain.linearRampToValueAtTime(0,at+length);
    osc.connect(gain);gain.connect(ctx.destination);
    const voice={osc,gain};this.voices.add(voice);
    osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices.delete(voice);};
    osc.start(at);osc.stop(at+length+.01);
  }
  stop() {
    clearInterval(this.timer);this.timer=null;this.playing=false;
    for(const {osc,gain} of this.voices){osc.onended=null;try{osc.stop();}catch{}osc.disconnect();gain.disconnect();}
    this.voices.clear();
  }
  get step() {return this.playing ? Math.floor(Math.max(0,this.context.currentTime-this.started)/this.duration*16)%16 : -1;}
}
