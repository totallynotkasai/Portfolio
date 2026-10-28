import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {view} from './helpers/starweave-view.mjs';
import {KEY,blank,recipe,stringify,tune,clone} from '../starweave-model.js';
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

test('production numbered controls place, replace, erase, undo and cross circle boundaries with keyboard focus',()=>{
  const v=view();try{
    v.click('new');v.change('rune','ember');v.change('duration',4);v.body.querySelector('.st-moments').children[0].click();
    assert.deepEqual(v.pattern.notes.map(n=>[n.rune,n.pitch,n.duration]),[['ember',67,4]]);
    const id=v.pattern.notes[0].id;v.change('pitch',60);v.body.querySelector('.st-moments').children[0].click();assert.equal(v.pattern.notes[0].id,id);
    v.body.querySelector('.st-moments').children[0].fire('keydown',{key:'Delete'});assert.equal(v.pattern.notes.length,0);v.click('undo');assert.equal(v.pattern.notes[0].id,id);
    v.click('add');const buttons=v.body.querySelector('.st-moments').children;buttons[0].fire('keydown',{key:'ArrowLeft'});assert.match(v.doc.activeElement.getAttribute('aria-label'),/^Moment 16:/);
    buttons[15].fire('keydown',{key:'ArrowRight'});assert.match(v.doc.activeElement.getAttribute('aria-label'),/^Moment 17:/);
    v.click('remove');assert.equal(v.pattern.bars,1);
  }finally{v.cleanup();}
});
test('production JSON import reports errors without mutation and Undo restores valid imports',()=>{
  const v=view();try{const before=clone(v.pattern);v.$('json').value='{bad';v.click('import');assert.match(v.message,/JSON could not be read/);assert.deepEqual(v.pattern,before);
    v.$('json').value=stringify(recipe('embers'));v.click('import');assert.equal(v.pattern.title,'Mischievous embers');v.click('undo');assert.deepEqual(v.pattern,before);
  }finally{v.cleanup();}
});
test('explicit title commit reaches autosave, editable JSON and the export name',()=>{
  const v=view();try{v.$('title').value='My renamed spell';v.click('set-title');assert.equal(v.pattern.title,'My renamed spell');v.click('show-json');assert.equal(JSON.parse(v.$('json').value).title,'My renamed spell');v.click('json-download');assert.equal(v.downloads[0].name,'My-renamed-spell.json');}finally{v.cleanup();}
});
test('tempo dragging stops sound immediately and commits one undoable autosave on change',async()=>{
  const v=view();try{v.click('play');await flush();v.change('tempo',100,'input');v.change('tempo',120,'input');assert.equal(v.intervals.size,0);assert.equal(v.pattern.tempo,90);v.change('tempo',120);assert.equal(v.pattern.tempo,120);v.click('undo');assert.equal(v.pattern.tempo,90);}finally{v.cleanup();}
});
test('the visual star follows the audio clock into successive circles',async()=>{
  const v=view();try{const p=recipe();p.bars=8;p.tempo=160;v.$('json').value=stringify(p);v.click('import');v.click('play');await flush();v.context.currentTime=1.8;const frame=[...v.frames.values()][0];assert.ok(frame);frame();assert.equal(v.$('page').value,1);assert.match(v.body.querySelector('.st-moments').children[0].getAttribute('aria-label'),/^Moment 17:/);}finally{v.cleanup();}
});
test('async file reads reject malformed or oversized files and cannot overwrite newer edits or newer file choices',async()=>{
  const v=view();try{
    const before=clone(v.pattern);v.$('file').files=[{size:90000,text:async()=>stringify(blank())}];v.$('file').fire('change');await flush();assert.match(v.message,/too large/);assert.deepEqual(v.pattern,before);
    v.$('file').files=[{size:4,text:async()=>'{bad'}];v.$('file').fire('change');await flush();assert.match(v.message,/JSON could not/);assert.deepEqual(v.pattern,before);
    let complete;v.$('file').files=[{size:100,text:()=>new Promise(r=>complete=r)}];v.$('file').fire('change');v.click('new');complete(stringify(recipe()));await flush();assert.match(v.message,/cancelled/);assert.equal(v.$('json').value,'');
    let first;v.$('file').files=[{size:100,text:()=>new Promise(r=>first=r)}];v.$('file').fire('change');v.$('file').files=[{size:100,text:async()=>stringify(recipe('embers'))}];v.$('file').fire('change');await flush();first(stringify(recipe()));await flush();assert.equal(JSON.parse(v.$('json').value).title,'Mischievous embers');assert.equal(v.pattern.notes.length,0);
  }finally{v.cleanup();}
});
test('named save/load/replace and deletion recovery persist through close, reopen and reload',()=>{
  const v=view();try{
    const before=clone(v.pattern);v.change('name','Saved spell');v.click('save');const raw=v.saved.get(KEY),id=JSON.parse(raw).saves[0].id;
    v.click('new');v.change('saved',id);v.click('load');assert.deepEqual(v.pattern,before);
    v.click('delete');assert.equal(JSON.parse(v.saved.get(KEY)).saves.length,0);v.reload();v.click('restore');assert.equal(JSON.parse(v.saved.get(KEY)).saves[0].id,id);
    v.change('saved',id);v.change('name','Replaced');v.click('new');v.click('replace');assert.equal(JSON.parse(v.saved.get(KEY)).saves[0].pattern.notes.length,0);
    v.close();v.reopen();assert.equal(v.pattern.notes.length,0);assert.equal(v.$('saved').children[1].textContent,'Replaced');
  }finally{v.cleanup();}
});
test('invalid storage, quota failure and concurrent-tab updates keep the open spell usable and report honestly',()=>{
  for(const options of [{stored:'broken'},{blocked:true},{}]){const v=view(options);try{
    if(!options.stored&&!options.blocked){v.saved.set(KEY,'changed externally');v.click('new');assert.match(v.$('storage').textContent,/Another tab/);}
    else v.click('new');v.change('name','Session only');v.click('save');assert.match(v.message,/open session/);assert.equal(v.$('title').value,'My musical spell');
    if(options.stored)assert.equal(v.saved.get(KEY),'broken');
  }finally{v.cleanup();}}
  const v=view();try{v.setBlocked(true);v.change('name','Quota');v.click('save');assert.match(v.message,/open session/);assert.match(v.$('storage').textContent,/failed/);}finally{v.cleanup();}
});
test('damaged local library remains untouched until the explicit recovery confirmation',()=>{
  const v=view({stored:'broken'});try{v.click('reset');assert.equal(v.saved.get(KEY),'broken');v.click('cancel-reset');assert.equal(v.saved.get(KEY),'broken');v.click('reset');v.click('reset');assert.equal(JSON.parse(v.saved.get(KEY)).version,1);assert.equal(v.pattern.title,'Starlight greeting');assert.match(v.$('storage').textContent,/retained/);}finally{v.cleanup();}
});
test('practice checks actual data, protects autosave and restores composition/history on cancellation',()=>{
  const v=view();try{
    v.click('new');v.click('undo');const before=clone(v.pattern),raw=v.saved.get(KEY);
    v.change('tune','bell');v.click('begin');assert.equal(v.saved.get(KEY),raw);assert.equal(v.$('save').disabled,true);v.click('check');assert.match(v.$('result').textContent,/0 of 4/);
    v.$('json').value=stringify(tune('bell'));v.click('import');v.click('check');assert.match(v.$('result').textContent,/You matched/);assert.equal(v.saved.get(KEY),raw);
    v.click('leave');assert.deepEqual(v.pattern,before);assert.equal(v.doc.activeElement,v.$('begin'));assert.equal(v.$('save').disabled,false);
  }finally{v.cleanup();}
});
test('actual view lifecycle cancels all live sources, timers and animation frames on every exit',async()=>{
  for(const exit of ['stop','edit','mute','hush','hide','blur','focus','minimise','context','close']){
    const v=view();try{
      v.click('play');await flush();assert.equal(v.intervals.size,1);assert.ok(v.sources.length>0);
      if(exit==='stop')v.click('stop');if(exit==='edit')v.click('new');if(exit==='mute'){v.K.sound.on=false;v.K.emit('sound',{on:false});}if(exit==='hush')v.K.emit('silence',{});
      if(exit==='hide'){v.doc.hidden=true;v.doc.fire('visibilitychange');}if(exit==='blur')v.system.fire('blur');if(exit==='focus')v.K.emit('windowfocus',{id:'games'});if(exit==='minimise')v.K.emit('minimise',{id:'starweave'});
      if(exit==='context'){v.context.state='interrupted';v.context.fire('statechange');}if(exit==='close')v.close();
      assert.equal(v.intervals.size,0,exit);assert.equal(v.frames.size,0,exit);assert.ok(v.sources.every(o=>o.disconnected),exit);
      if(exit==='close'){assert.equal(v.listeners(),0);v.reopen();assert.equal(v.$('stop').disabled,true);}
    }finally{v.cleanup();}
  }
});
test('actual view cancels delayed resume on close and does not revive after reopen',async()=>{
  const v=view({pending:true});try{v.click('play');assert.equal(v.$('stop').disabled,false);v.close();v.reopen();v.resume();await flush();assert.equal(v.sources.length,0);assert.equal(v.intervals.size,0);assert.equal(v.$('stop').disabled,true);}finally{v.cleanup();}
});
test('pet conductor uses animated states normally and explicit still frames only with reduced motion',()=>{
  for(const reduced of [false,true]){const v=view({reduced});try{
    v.click('new');v.body.querySelector('.st-moments').children[0].click();const pet=v.body.querySelector('.st-conductor svg');
    assert.equal(pet.getAttribute('data-state'),reduced?'idle':'happy');assert.equal(pet.getAttribute('data-frame'),reduced?'happy':null);
    assert.match(v.body.querySelector('.st-conductor').innerHTML,/st-starweave-wz-figure/);
    v.motion.matches=!reduced;v.motion.fire('change');assert.equal(pet.getAttribute('data-frame'),reduced?null:'idle');
  }finally{v.cleanup();}}
});
test('production PNG drawing includes every circle, exact kept pitch and actual duration',()=>{
  const v=view();try{const p=blank();p.bars=3;p.palette=[62,65,69,74];p.title='A <literal> spell';p.notes=[{id:'held',start:15,duration:4,pitch:60,rune:'moon'},{id:'end',start:47,duration:1,pitch:84,rune:'star'}];v.$('json').value=stringify(p);v.click('import');v.click('png');const labels=v.drawing.map(x=>String(x[0]));assert.ok(labels.includes('A <literal> spell'));assert.ok(labels.some(t=>t.includes('C4 ×4')));assert.ok(labels.some(t=>t.includes('C6 ×1')));assert.ok(labels.some(t=>t.startsWith('Circle 3')));assert.ok(labels.some(t=>t.includes('Continues from previous circle')));assert.equal(v.downloads[0].name,'A-literal-spell.png');}finally{v.cleanup();}
});
test('lazy loader disposes synchronously before the shared OS window body is replaced',async()=>{
  const original=readFileSync(new URL('../musicbox.js',import.meta.url),'utf8'),source=original.replace("import('/starweave-view.js')",'loadModule()');const events=[];
  const app={mount(){events.push('mount');},unmount(){events.push('unmount');}},K={},marker={isConnected:true},body={set innerHTML(_){marker.isConnected=true;},get firstElementChild(){return marker;},replaceChildren(){events.push('clear');marker.isConnected=false;}};
  vm.runInNewContext(source,{window:{Kasai:K},console,loadModule:()=>Promise.resolve(app)});const win={body};K.starweave.mount(win);await flush();K.starweave.unmount(win);assert.deepEqual(events,['mount','unmount','clear']);K.starweave.mount(win);await flush();assert.equal(events.at(-1),'mount');
});
test('production event subscriptions detach, and the real sound service shares its mixer and hush lifecycle',()=>{
  const core=readFileSync(new URL('../kasai-core.js',import.meta.url),'utf8'),sound=readFileSync(new URL('../sound.js',import.meta.url),'utf8');
  const document={hidden:false,addEventListener(){},documentElement:{setAttribute(){}}},window={addEventListener(){}},mixes=[];
  vm.runInNewContext(core,{window,document,console});const K=window.Kasai;let calls=0;const off=K.on('test',()=>calls++);K.emit('test',{});off();K.emit('test',{});assert.equal(calls,1);
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelAndHoldAtTime(){}});
  class AudioContext {
    constructor(){this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination={};}
    createDynamicsCompressor(){return{threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}};}
    createGain(){const g={gain:param(),connect(to){g.to=to;}};mixes.push(g);return g;}
    createBufferSource(){return{connect(){},start(){}};}createBuffer(){return{};}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
  }
  K.store={get:()=>({on:false}),set(){}};window.AudioContext=AudioContext;
  vm.runInNewContext(sound,{window,document,console,performance});assert.equal(K.sound.instrument(),null);
  K.sound.set(true,true);const a=K.sound.instrument(),b=K.sound.instrument();assert.equal(a.context,b.context);assert.equal(a.output,b.output);assert.equal(a.output,mixes[1]);assert.notEqual(a.output,a.context.destination);
  let silence=0;K.on('silence',()=>silence++);K.sound.hush();K.sound.set(false);assert.equal(silence,2);assert.equal(a.context.state,'suspended');assert.equal(K.sound.instrument(),null);
});
