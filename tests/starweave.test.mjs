import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RUNES,PALETTES,clone,blank,validate,parse,stringify,place,erase,palette,resize,point,cell,recipe,TUNES,tune,match,readLibrary,saveNamed} from '../starweave-model.js';
import {SpellAudio,Playback} from '../starweave-audio.js';
import {stampAssetUrls} from '../build/build.mjs';

test('production circle maps sixteen clockwise moments and every custom ring exactly',()=>{
  for(const pitches of [...Object.values(PALETTES),[48,53,77,84]])for(let step=0;step<16;step++)for(const pitch of pitches){const q=point(step,pitch,pitches);assert.deepEqual(cell(q.x,q.y,pitches),{moment:step,pitch});}
  assert.equal(cell(250,250,blank().palette),null);assert.equal(cell(0,0,blank().palette),null);
  assert.equal(point(1,61,blank().palette).outside,true);
});
test('replace preserves occurrence IDs; erase is local and palette changes never retune',()=>{
  const a=recipe(),old=clone(a),b=place(a,0,'ember',69,4),c=palette(b,PALETTES['D minor']);
  assert.equal(b.notes[0].id,a.notes[0].id);assert.equal(c.notes[0].id,a.notes[0].id);assert.deepEqual(c.notes,b.notes);assert.deepEqual(a,old);
  assert.equal(erase(c,0).notes.length,c.notes.length-1);assert.deepEqual(parse(stringify(c)),c);
});
test('eight circles retain absolute starts and crossing holds; shortening never drops music',()=>{
  let p=resize(blank(),8);p=place(p,15,'moon',60,4);p=place(p,127,'star',84,1);
  assert.deepEqual(p.notes.map(n=>[n.start,n.duration]),[[15,4],[127,1]]);
  assert.throws(()=>resize(p,7),/notes|hold/);assert.throws(()=>place(p,127,'moon',60,2),/duration/);
  assert.throws(()=>resize(p,9),/1–8/);assert.throws(()=>place(p,12,'star',60,3),/duration/);
  assert.deepEqual(parse(stringify(p)),p);
});
test('import rejects malformed, stale, unsafe, duplicate and unbounded data without mutation',()=>{
  const p=recipe(),before=clone(p),cases=[null,[],{...p,version:2},{...p,extra:1},{...p,title:''},{...p,tempo:Infinity},{...p,loop:1},{...p,bars:0},{...p,palette:[60,60,67,72]},{...p,palette:[72,67,64,60]},{...p,notes:[{...p.notes[0],rune:'__proto__'}]},{...p,notes:[{...p.notes[0],pitch:85}]},{...p,notes:[{...p.notes[0],duration:0}]},{...p,notes:[{...p.notes[0],start:-1}]},{...p,notes:[p.notes[0],p.notes[0]]},{...p,notes:[{...p.notes[0],id:'<script>'}]},{...p,notes:[{...p.notes[0],unknown:true}]}];
  for(const bad of cases)assert.throws(()=>parse(JSON.stringify(bad)));
  assert.throws(()=>parse('{bad'),/JSON could not be read/);assert.throws(()=>parse(' '.repeat(80001)),/large/);assert.deepEqual(p,before);
});
test('accepted original recipes keep their exact pitches, attacks and rune envelopes',()=>{
  for(const id of ['starlight','lullaby','embers']){const p=recipe(id);assert.equal(p.notes.length,8);assert.deepEqual(p.notes.map(n=>n.start),[0,2,4,6,8,10,12,14]);assert.equal(new Set(p.notes.map(n=>n.id)).size,8);}
  assert.deepEqual(recipe('lullaby').notes.map(n=>n.pitch),[67,64,60,64,67,72,67,60]);assert.ok(recipe('lullaby').notes.every(n=>n.rune==='moon'&&n.duration===2));assert.throws(()=>recipe('bad'));
});
test('Match the tune requires exact musical data and no extra attacks, independent of IDs',()=>{
  for(const t of TUNES){const target=tune(t.id),copy=clone(target);copy.notes.forEach((n,i)=>n.id='copy-'+i);assert.equal(match(copy,target).complete,true);
    for(const field of ['rune','pitch','start','duration']){const p=clone(copy);p.notes[0][field]=field==='rune'?'moon'===p.notes[0].rune?'star':'moon':field==='duration'?2===p.notes[0].duration?1:2:p.notes[0][field]+1;assert.equal(match(p,target).complete,false);}
    assert.equal(match(place(copy,1,'star',60,1),target).complete,false);assert.equal(match(erase(copy,0),target).correct,3);
  }
});
test('local library validates entries independently, preserves good saves and refuses stale storage',()=>{
  assert.equal(readLibrary(null).library.autosave,null);
  for(const raw of ['broken','null','{"version":4,"saves":[]}']){const r=readLibrary(raw);assert.equal(r.blocked,true);assert.match(r.warning,/untouched/);}
  const library={version:1,autosave:{bad:1},saves:[{id:'good',name:'Good',pattern:recipe()},{id:'bad',name:'Bad',pattern:{}}],deleted:null};
  const r=readLibrary(JSON.stringify(library));assert.equal(r.library.saves.length,1);assert.equal(r.library.saves[0].id,'good');assert.equal(r.blocked,true);
  const healthy={...library,autosave:recipe(),saves:[library.saves[0]],deleted:{id:'deleted',name:'Deleted',pattern:recipe('embers')}};
  assert.deepEqual(readLibrary(JSON.stringify(healthy)).library,healthy);
});
test('named saves enforce distinct accessible names, cap and explicit replacement while retaining IDs',()=>{
  const lib=readLibrary(null).library,result=saveNamed(lib,'  My spell  ',recipe());assert.equal(result.library.saves[0].name,'My spell');assert.equal(lib.saves.length,0);
  assert.throws(()=>saveNamed(result.library,'MY SPELL',recipe()),/already saved/);
  const replaced=saveNamed(result.library,'Changed',recipe('embers'),result.id);assert.equal(replaced.id,result.id);assert.equal(replaced.library.saves.length,1);assert.equal(replaced.library.saves[0].pattern.title,'Mischievous embers');
  let full=lib;for(let i=0;i<24;i++)full=saveNamed(full,'Spell '+i,blank()).library;assert.throws(()=>saveNamed(full,'Full',blank()),/24/);assert.throws(()=>saveNamed(full,'',blank()),/name/);assert.throws(()=>saveNamed(full,'x',blank(),'missing'),/Select/);
});

function fakeAudio() {
  const sources=[],outputs=[],tasks=new Set(),events=new EventTarget();
  const context={state:'running',currentTime:0,destination:{},resume:async()=>{},addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args),
    createOscillator(){const o={frequency:{value:0},connect(to){o.to=to;},disconnect(){o.disconnected=true;},start(at){o.at=at;},stop(at){o.end=at;}};sources.push(o);return o;},
    createGain(){const g={gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(to){g.to=to;},disconnect(){g.disconnected=true;}};outputs.push(g);return g;},
  };
  const clock={setInterval(fn){tasks.add(fn);return fn;},clearInterval(fn){tasks.delete(fn);}};
  return {context,sources,outputs,clock,tasks,tick(time){context.currentTime=time;for(const fn of [...tasks])fn();},interrupt(state='suspended'){context.state=state;events.dispatchEvent(new Event('statechange'));}};
}
test('production voices preserve the accepted distinct harmonics and route through the global mixer',()=>{
  const f=fakeAudio(),bus={},a=new SpellAudio(f.context,bus,f.clock);
  for(const rune of Object.keys(RUNES))a.note({rune,pitch:60},0,.3);
  assert.equal(f.sources.length,6);assert.equal(f.sources[2].type,'triangle');assert.ok(f.sources[1].frequency.value>f.sources[0].frequency.value*2);assert.ok(f.sources[5].frequency.value<f.sources[4].frequency.value*1.01);assert.ok(f.outputs.every(g=>g.to===bus));a.stop();assert.ok(f.sources.every(o=>o.disconnected));assert.ok(f.outputs.every(g=>g.disconnected));
});
test('rolling audio-clock schedule retains four-moment notes and queues only the near horizon',()=>{
  const f=fakeAudio(),a=new SpellAudio(f.context,{},f.clock),p=resize(blank(),8);p.notes=place(p,0,'moon',60,4).notes;p.notes.push({id:'later',rune:'star',pitch:72,start:127,duration:1});
  a.start(p);assert.equal(f.sources.length,2);assert.equal(f.sources[0].at,.06);assert.ok(f.sources[0].end-f.sources[0].at>.6);
  for(let time=.1;time<21.2;time+=.1)f.tick(time);
  assert.equal(f.sources.length,4);assert.equal(a.step,126);a.stop();assert.equal(f.tasks.size,0);assert.equal(a.step,-1);assert.equal(a.voices.size,0);
});
test('loop boundary and single play use total composition length, not sixteen moments',()=>{
  const f=fakeAudio(),a=new SpellAudio(f.context,{},f.clock);const p=resize(place(blank(),0,'ember',60,1),2);p.tempo=120;
  a.start(p);for(let t=.1;t<=4.2;t+=.1)f.tick(t);f.tick(4.2);assert.equal(f.sources.length,4);assert.equal(a.step,1);a.stop();
  p.loop=false;let result='';a.start(p,r=>result=r);const end=a.started+a.duration;for(let t=f.context.currentTime+.1;t<end+.1;t+=.1)f.tick(t);assert.equal(result,'complete');assert.equal(a.playing,false);assert.equal(f.tasks.size,0);
});
test('Stop cancels every scheduled attack and natural end detaches both nodes',()=>{
  const f=fakeAudio(),a=new SpellAudio(f.context,{},f.clock);a.start(recipe());const old=[...f.sources];old[0].onended();assert.equal(old[0].disconnected,true);a.start(recipe('embers'));assert.ok(old.every(o=>o.disconnected));a.stop();assert.ok(f.sources.every(o=>o.disconnected));assert.equal(a.timer,null);
});
test('stalled or interrupted clocks stop rather than issuing a backlog of notes',()=>{
  for(const cause of ['stall','state']){const f=fakeAudio(),a=new SpellAudio(f.context,{},f.clock);let reason='';a.start(recipe(),r=>reason=r);if(cause==='state')f.context.state='interrupted';f.tick(cause==='stall'?5:.1);assert.equal(reason,'interrupted');assert.equal(a.voices.size,0);assert.equal(f.tasks.size,0);assert.ok(f.sources.every(o=>o.disconnected));}
});
test('every cancellation invalidates a pending resume; obsolete Play cannot revive or stop its successor',async()=>{
  for(const cause of ['Stop','edit','mute','hidden','blur','minimise','close','interruption']){
    const f=fakeAudio();let resume,allowed=true;f.context.resume=()=>new Promise(resolve=>resume=resolve);const p=new Playback(()=>({context:f.context,output:{}}),()=>allowed);
    const pending=p.start(recipe());p.stop(cause);allowed=false;resume();assert.equal(await pending,false);assert.equal(f.sources.length,0);assert.equal(p.pending,false);
  }
  const f=fakeAudio();let first;f.context.resume=()=>new Promise(r=>first=r);const p=new Playback(()=>({context:f.context,output:{}}),()=>true);const obsolete=p.start(recipe());f.context.resume=async()=>{};await p.start(recipe('embers'));const active=p.audio;first();assert.equal(await obsolete,false);assert.equal(p.audio,active);p.stop();
});
test('native AudioContext state changes cancel live transport and release state listeners',async()=>{
  const f=fakeAudio(),p=new Playback(()=>({context:f.context,output:{}}),()=>true);await p.start(recipe());const audio=p.audio;f.interrupt('interrupted');assert.equal(audio.voices.size,0);assert.equal(audio.timer,null);assert.equal(p.audio,null);assert.ok(f.sources.every(o=>o.disconnected));
  f.context.state='running';await p.start(recipe());p.stop();f.interrupt();assert.equal(p.audio,null);
});
test('failed or forbidden audio activation never leaves pending state or a timer',async()=>{
  for(const [acquire,allowed] of [[()=>null,()=>true],[()=>{throw new Error('failed');},()=>true],[()=>null,()=>false]]){const p=new Playback(acquire,allowed);await assert.rejects(()=>p.start(recipe()));assert.equal(p.pending,false);assert.equal(p.audio,null);}
});
test('production cache stamps follow transitive module changes through lazy app and HTML',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'starweave-stamp-'));
  try{
    async function build(note){await writeFile(join(dir,'z-model.js'),'export const note='+note+';');await writeFile(join(dir,'b-view.js'),"import {note} from './z-model.js';");await writeFile(join(dir,'a-loader.js'),"import('/b-view.js');");await writeFile(join(dir,'about.html'),'<script src="/a-loader.js"></script>');await stampAssetUrls(dir);return readFile(join(dir,'about.html'),'utf8');}
    const a=await build(60),b=await build(64);assert.notEqual(a,b);assert.match(await readFile(join(dir,'b-view.js'),'utf8'),/\.\/z-model\.js\?v=/);assert.match(await readFile(join(dir,'a-loader.js'),'utf8'),/\/b-view\.js\?v=/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
