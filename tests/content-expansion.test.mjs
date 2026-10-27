import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {blank,paintPath,events,joinAt,splitAt,sample} from '../design-lab/content-expansion/music-model.mjs';
import {NoteTransport} from '../design-lab/content-expansion/music-audio.mjs';
import {RULES as R,createMatch,advancePuck,moveStriker,setPower,tick,prepareServe} from '../design-lab/content-expansion/hockey-physics.mjs';

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
const rally=()=>{const s=createMatch();s.phase='rally';return s;};
test('striker targets cannot teleport, exceed speed, or cross the half-table buffer',()=>{
  const s=rally();moveStriker(s.player,{x:10000,y:-10000},R.dt,'player');assert.ok(Math.hypot(s.player.vx,s.player.vy)<=R.strikerSpeed+1e-7);
  for(let n=0;n<1000;n++)moveStriker(s.player,{x:-999,y:-999},R.dt,'player');
  assert.equal(s.player.x,59);assert.equal(s.player.y,494);
});
test('swept puck hits a moving striker and rounded goal posts at powered speed',()=>{
  const s=rally();Object.assign(s.puck,{x:300,y:600,vx:0,vy:980});advancePuck(s,.2);
  assert.ok(s.puck.vy<0);assert.equal(s.scores[1],0);assert.equal(s.rally,1);
  const moving=rally();Object.assign(moving.player,{x:320,y:730,vx:560,vy:0});Object.assign(moving.puck,{x:280,y:660,vx:0,vy:700});advancePuck(moving,.1,{player:{x:264,y:730},ai:moving.ai});assert.equal(moving.rally,1);assert.ok(moving.puck.vy<0);
  const post=rally();Object.assign(post.puck,{x:213,y:70,vx:0,vy:-980});advancePuck(post,.09);assert.equal(post.scores[0],0);assert.ok(post.puck.vx>0);assert.ok(Number.isFinite(post.puck.y));
});
test('goal opening accounts for puck radius and scores once; conceding side receives',()=>{
  const s=rally();Object.assign(s.puck,{x:300,y:80,vx:0,vy:-980});advancePuck(s,.12);assert.deepEqual(s.scores,[1,0]);assert.equal(s.phase,'countdown');assert.equal(s.serveTo,1);
  tick(s,.2,{player:s.player,ai:s.ai});assert.deepEqual(s.scores,[1,0]);
  const wall=rally();Object.assign(wall.puck,{x:100,y:50,vx:0,vy:-980});advancePuck(wall,.1);assert.ok(wall.puck.vy>0);assert.deepEqual(wall.scores,[0,0]);
  const edge=rally();Object.assign(edge.puck,{x:205,y:50,vx:0,vy:-980});advancePuck(edge,.06);assert.equal(edge.scores[0],0);
});
test('Fire bank boost is capped, next return consumes it and bounded recoil keeps control',()=>{
  const s=rally();setPower(s,'fire');Object.assign(s.puck,{x:20,y:450,vx:-650,vy:200});advancePuck(s,.03);assert.ok(s.puck.vx>650);assert.ok(Math.hypot(s.puck.vx,s.puck.vy)<=R.speed*1.3);
  Object.assign(s.puck,{x:300,y:650,vx:0,vy:800});const before=s.player.y;advancePuck(s,.1);assert.equal(s.power,null);assert.ok(s.puck.vy<0);assert.ok(s.player.y-before<=18);assert.ok(s.player.y>before);assert.ok(Math.hypot(s.puck.vx,s.puck.vy)<=R.speed*1.4);
});
test('Electric banks preserve vertical direction, use 45 degrees, consume two banks',()=>{
  const s=rally();setPower(s,'electric');Object.assign(s.puck,{x:20,y:450,vx:-600,vy:-100});advancePuck(s,.03);assert.ok(s.puck.vx>0);assert.ok(s.puck.vy<0);assert.ok(Math.abs(Math.abs(s.puck.vx)-Math.abs(s.puck.vy))<1e-5);assert.equal(s.power.banks,1);
  Object.assign(s.puck,{x:580,y:450,vx:600,vy:-100});advancePuck(s,.03);assert.equal(s.power,null);assert.ok(s.puck.vx<0);assert.ok(s.puck.vy<0);
});
test('Electric next striker return amplifies sideways contribution and spends the charge',()=>{
  function hit(power){const s=rally();setPower(s,power);Object.assign(s.player,{vx:100});Object.assign(s.puck,{x:300,y:680,vx:0,vy:600});advancePuck(s,.03,{player:{x:297,y:730},ai:s.ai});return s;}
  const plain=hit('plain'),electric=hit('electric');assert.equal(electric.power,null);assert.ok(Math.abs(electric.puck.vx)>Math.abs(plain.puck.vx));assert.ok(electric.puck.vy<0);
});
test('paused/countdown simulation freezes powers and pickup timers; goals clear powers',()=>{
  const s=rally();setPower(s,'fire');s.phase='paused';const before=structuredClone(s);tick(s,1,{player:s.player,ai:s.ai});assert.deepEqual(s,before);
  s.phase='countdown';s.countdown=2;tick(s,.2,{player:s.player,ai:s.ai});assert.equal(s.power.left,5);assert.equal(s.spawnIn,8);
  s.phase='rally';s.power.left=.001;tick(s,R.dt,{player:s.player,ai:s.ai},false);assert.equal(s.power,null);
  setPower(s,'electric');prepareServe(s);assert.equal(s.power,null);assert.equal(s.pickup,null);
});
test('puck crossing collects an armed pickup; warmup prevents surprise collection',()=>{
  const s=rally();s.pickup={x:300,y:450,age:.7,type:'electric'};Object.assign(s.puck,{x:200,y:450,vx:980,vy:0});advancePuck(s,.15);assert.equal(s.pickup,null);assert.equal(s.power.type,'electric');
  const warm=rally();warm.pickup={x:300,y:450,age:.3,type:'fire'};Object.assign(warm.puck,{x:200,y:450,vx:980,vy:0});advancePuck(warm,.15);assert.equal(warm.power,null);
});
test('pickups spawn after active time only, expire, and never stack with a power',()=>{
  const s=rally(),targets={player:s.player,ai:s.ai},rng=()=>.5;s.puck.x=60;s.puck.y=450;
  tick(s,7.9,targets,true,rng);assert.equal(s.pickup,null);
  tick(s,.11,targets,true,rng);assert.ok(s.pickup);assert.equal(s.pickup.age,.11);
  s.phase='paused';const age=s.pickup.age;tick(s,3,targets,true,rng);assert.equal(s.pickup.age,age);
  s.phase='rally';s.pickup.age=6.59;tick(s,.02,targets,true,rng);assert.equal(s.pickup,null);assert.ok(s.spawnIn>=10);
  setPower(s,'fire');s.spawnIn=0;tick(s,.5,targets,true,rng);assert.equal(s.pickup,null);assert.equal(s.power.left,4.5);
});
test('seeded stress rallies stay finite, capped, on table and finish at five',()=>{
  let seed=1234;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let match=0;match<5;match++){
    const s=rally();Object.assign(s.puck,{vx:500,vy:600});
    for(let n=0;n<25000&&s.phase!=='finished';n++){
      if(n%180===0)setPower(s,n%360?'fire':'electric');
      tick(s,R.dt,{player:{x:80+rng()*440,y:700+rng()*120},ai:{x:s.puck.x,y:170}},true,rng);
      assert.ok([s.puck.x,s.puck.y,s.puck.vx,s.puck.vy].every(Number.isFinite));
      assert.ok(s.puck.x>=-1&&s.puck.x<=601);assert.ok(s.puck.y>=-1&&s.puck.y<=901);
      assert.ok(Math.hypot(s.puck.vx,s.puck.vy)<=R.speed*1.4+1e-6);
      assert.ok(s.scores.every(score=>score<=5));
    }
    assert.equal(s.phase,'finished');assert.ok(s.scores.includes(5));
  }
});
test('production packaging excludes review directories and production pages do not load previews',()=>{
  const build=readFileSync(new URL('../build/build.mjs',import.meta.url),'utf8');assert.match(build,/const SITE_DIRS = \['assets', 'fonts'\]/);
  const root=new URL('../',import.meta.url);for(const file of readdirSync(root).filter(f=>/\.(html|js)$/.test(f)))assert.doesNotMatch(readFileSync(new URL(file,root),'utf8'),/design-lab\/content-expansion/);
  // Build must run first for the physical artifact check (documented command).
  if(existsSync(new URL('../dist/about.html',import.meta.url)))assert.equal(existsSync(new URL('../dist/design-lab/content-expansion',import.meta.url)),false);
});
