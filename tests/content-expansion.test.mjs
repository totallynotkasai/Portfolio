import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {blank,paintPath,events,joinAt,splitAt,sample} from '../design-lab/content-expansion/music-model.mjs';
import {NoteTransport} from '../design-lab/content-expansion/music-audio.mjs';

test('drawing interpolates skipped columns in either direction; latest visit wins',()=>{
  const p=blank();paintPath(p,{step:0,row:14},{step:4,row:10},1);
  assert.deepEqual(p.slice(0,5).map(c=>c.pitch),[60,62,64,65,67]);
  paintPath(p,{step:4,row:12},{step:1,row:12},2);
  assert.deepEqual(p.slice(0,5).map(c=>c.pitch),[60,64,64,64,64]);
  assert.deepEqual(events(p).map(e=>[e.start,e.length]),[[0,1],[1,4]]);
});
test('same-stroke holds and separate-tap attacks stay distinct; erasing splits holds',()=>{
  const p=blank();paintPath(p,{step:0,row:14},{step:3,row:14},1);
  paintPath(p,{step:4,row:14},{step:4,row:14},2);
  assert.deepEqual(events(p).map(e=>e.length),[4,1]);
  paintPath(p,{step:1,row:14},{step:1,row:14},3,true);
  assert.deepEqual(events(p).map(e=>[e.start,e.length]),[[0,1],[2,2],[4,1]]);
  assert.equal(joinAt(p,4),true);assert.deepEqual(events(p).map(e=>e.length),[1,3]);
  assert.equal(splitAt(p,3,4),true);assert.deepEqual(events(p).map(e=>e.length),[1,1,2]);
  assert.equal(joinAt(p,2),false);
  paintPath(p,{step:0,row:0},{step:0,row:0},5,true);assert.equal(p[0].pitch,60,'erasing an empty row must not delete another pitch');
});
function fakeAudio(){
  const voices=[];
  const context={currentTime:0,destination:{},createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){o.disconnected=true;},start(at){o.at=at;},stop(at){o.until=at;}};voices.push(o);return o;},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};
  return {context,voices};
}
test('audio-clock schedule uses actual note lengths and Stop disconnects every queued voice',()=>{
  const {context,voices}=fakeAudio(),t=new NoteTransport(context);t.start(sample(),100,true);
  try{
    assert.equal(voices.length,events(sample()).length);assert.ok(Math.abs(voices[0].at-.06)<1e-8);
    const held=voices.find((v)=>Math.abs(v.at-(.06+2*.15))<1e-8);assert.ok(held.until-held.at>.28);
    context.currentTime=.52;assert.equal(t.step,3);
    t.stop();assert.equal(t.voices.size,0);assert.equal(t.step,-1);assert.equal(t.timer,null);assert.ok(voices.every(v=>v.disconnected));
    t.start(blank(),180,false);assert.equal(t.voices.size,0);
  }finally{t.stop();}
});
test('new audio starts cancel previous scheduled voices instead of layering transports',()=>{
  const {context,voices}=fakeAudio(),t=new NoteTransport(context);try{t.start(sample(),100,true);const count=voices.length;t.start(sample(),180,false);assert.ok(voices.slice(0,count).every(v=>v.disconnected));assert.equal(t.voices.size,count);}finally{t.stop();}
});
test('production packaging excludes review directories and production pages do not load previews',()=>{
  const build=readFileSync(new URL('../build/build.mjs',import.meta.url),'utf8');assert.match(build,/const SITE_DIRS = \['assets', 'fonts'\]/);
  const root=new URL('../',import.meta.url);for(const file of readdirSync(root).filter(f=>/\.(html|js)$/.test(f)))assert.doesNotMatch(readFileSync(new URL(file,root),'utf8'),/design-lab\/content-expansion/);
  // Build must run first for the physical artifact check (documented command).
  if(existsSync(new URL('../dist/about.html',import.meta.url)))assert.equal(existsSync(new URL('../dist/design-lab/content-expansion',import.meta.url)),false);
});
