import test from 'node:test';
import assert from 'node:assert/strict';
import {DUEL as D,createDuel,shield,cast,tickDuel,advanceOrb,wardPoints,segmentTOI} from '../design-lab/content-expansion/duel-rules.mjs';

const active=()=>{const s=createDuel();s.phase='active';return s;};
const old=s=>s.hats.map(h=>({x:h.x,y:h.y}));
function incoming(s,props={}){cast(s,1,{x:300,y:760});const orb=s.orbs[0];Object.assign(orb,{x:300,y:450,vx:0,vy:520},props);return orb;}

test('the ward is a forward curve with open flanks, not a hat-centred hit area',()=>{
  const s=active();shield(s,0,{x:300,y:0});const w=s.wards[0],p=wardPoints(w);
  assert.equal(p.length,25);assert.ok(p.every(point=>point.y<s.hats[0].y));
  assert.equal(p[0].x,246);assert.equal(p.at(-1).x,354);assert.equal(p[12].y,572);
  assert.equal(s.hats[0].shield,undefined);
  assert.equal(segmentTOI({x:380,y:500},{x:0,y:520},p[0],p[1],15,.2),null);
});

test('ward direction is captured at launch and moves independently of the hat',()=>{
  const s=active();shield(s,0,{x:500,y:0});const w=s.wards[0],origin={...w};
  for(let i=0;i<24;i++)tickDuel(s,D.dt,{ai:false,target:{x:50,y:715},aim:{x:0,y:0}});
  assert.ok(s.hats[0].x<300);assert.ok(w.x>origin.x);assert.ok(w.y<origin.y);
  assert.ok(Math.abs(w.x-(origin.x+origin.vx*.2))<1e-6);assert.equal(w.nx,origin.nx);
});

test('a remote ward intercepts a fast spell before it reaches the hat, retaining its power',()=>{
  const s=active();shield(s,0,{x:300,y:0});const o=incoming(s,{power:'fire'});
  assert.equal(advanceOrb(s,o,.2,old(s),{x:50,y:0}),true);
  assert.equal(s.hats[0].hp,6);assert.equal(o.owner,0);assert.equal(o.caster,1);assert.equal(o.power,'fire');
  assert.ok(o.vy<0);assert.ok(o.y<550);assert.equal(s.wards[0].spent,true);assert.equal(s.parries,1);
  // A spent curve remains visible briefly, but cannot return another spell.
  const second={...o,id:99,owner:1,x:300,y:600,vx:0,vy:520};
  assert.equal(advanceOrb(s,second,.1,old(s),{x:300,y:0}),false);assert.equal(s.parries,1);assert.equal(s.hats[0].hp,4);
});

test('sending a ward does not grant invulnerability behind it or catch friendly spells',()=>{
  const s=active();shield(s,0,{x:300,y:0});const o=incoming(s,{x:300,y:601});
  assert.equal(advanceOrb(s,o,.05,old(s),{x:300,y:0}),false);assert.equal(s.hats[0].hp,5);assert.equal(s.parries,0);
  const friendly=active();shield(friendly,0);cast(friendly,0,{x:300,y:0});const own=friendly.orbs[0];
  advanceOrb(friendly,own,.2,old(friendly),{x:300,y:0});assert.equal(friendly.wards[0].spent,false);assert.equal(friendly.parries,0);
});

test('wards expire at their deadline, cannot intercept later in a frame, and fade after contact',()=>{
  const s=active();shield(s,0);s.wards[0].life=.001;const o=incoming(s);
  advanceOrb(s,o,.2,old(s),{x:300,y:0});assert.equal(o.owner,1);assert.equal(s.parries,0);
  s.orbs=[];tickDuel(s,D.dt,{ai:false});assert.equal(s.wards.length,0);assert.equal(shield(s,0),false);
  const hit=active();shield(hit,0);const p=incoming(hit);advanceOrb(hit,p,.2,old(hit),{x:300,y:0});
  assert.equal(hit.wards[0].life,.14);for(let i=0;i<18;i++)tickDuel(hit,D.dt,{ai:false});assert.equal(hit.wards.length,0);
});

test('pause and resume countdown freeze travelling wards and drifting runes together',()=>{
  const s=active();shield(s,0);tickDuel(s,.1,{ai:false});s.phase='paused';const snapshot=structuredClone(s);
  tickDuel(s,2,{ai:false});assert.deepEqual(s,snapshot);
  s.phase='countdown';s.countdown=1;const x=s.wards[0].x,y=s.wards[0].y,rune=structuredClone(s.runes[0]);
  tickDuel(s,.5,{ai:false});assert.equal(s.wards[0].x,x);assert.equal(s.wards[0].y,y);assert.deepEqual(s.runes[0],rune);
});

test('power runes drift at bounded speed, stay in the field and move while recharging',()=>{
  const s=active(),start=structuredClone(s.runes);s.runes[0].cooldown=1;
  tickDuel(s,.1,{ai:false});assert.notEqual(s.runes[0].x,start[0].x);assert.ok(s.runes[0].cooldown>0);
  let bounced=false,previous=s.runes.map(r=>({...r}));
  for(let i=0;i<12000;i++){
    tickDuel(s,D.dt,{ai:false});
    s.runes.forEach((r,j)=>{assert.ok(r.x>=75&&r.x<=525&&r.y>=180&&r.y<=580);assert.ok(Math.hypot(r.x-previous[j].x,r.y-previous[j].y)<=35*D.dt+1e-6);if(r.vx!==previous[j].vx||r.vy!==previous[j].vy)bounced=true;});
    previous=s.runes.map(r=>({...r}));
  }
  assert.equal(bounced,true);
});

test('moving-rune collection uses relative swept velocity instead of its stale position',()=>{
  const s=active();s.runes=[{x:200,y:400,type:'fire',cooldown:0,sweepVX:22,sweepVY:0}];
  const o={id:1,caster:0,owner:0,x:250,y:400,vx:1,vy:0,power:null,banks:0,bounces:0,life:8};
  advanceOrb(s,o,1,old(s),{x:300,y:0});assert.equal(o.power,'fire');
  const missed=active();missed.runes=[{x:300,y:400,type:'fire',cooldown:0,sweepVX:30,sweepVY:0}];
  const slow={...o,x:260,y:400,vx:20,vy:0,power:null,bounces:0};advanceOrb(missed,slow,1,old(missed),{x:300,y:0});assert.equal(slow.power,null);
});
