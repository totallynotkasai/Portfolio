import {circleTOI} from './hockey-physics.mjs';
export const DUEL={width:600,height:760,hatRadius:25,orbRadius:9,speed:275,orbSpeed:360,maxSpeed:520,shieldTime:.65,shieldCooldown:1.8,wardSpeed:280,wardWidth:108,wardDepth:18,wardThickness:6,health:6,dt:1/120,goalLeft:215,goalRight:385};
const D=DUEL,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createDuel(){return{phase:'ready',time:0,hats:[{x:300,y:625,hp:6,cooldown:0,castCooldown:0,immune:0},{x:300,y:135,hp:6,cooldown:0,castCooldown:0,immune:0}],orbs:[],wards:[],runes:[{x:220,y:330,vx:22,vy:13,type:'fire',cooldown:0},{x:380,y:430,vx:-17,vy:19,type:'electric',cooldown:0}],nextId:1,notice:'The little wizard challenges your hat. Cast when you choose.',event:0,lastEvent:'ready',aiThink:.2,aiCast:1.8,windup:0,aiAim:{x:300,y:625},aiTarget:{x:300,y:140},parries:0};}
function announce(s,message,event){s.notice=message;s.lastEvent=event;s.event++;}
export function shield(s,side,aim=s.hats[1-side]){
  const h=s.hats[side];if(s.phase!=='active'||h.cooldown>0)return false;
  const dx=aim.x-h.x,dy=side?Math.max(60,aim.y-h.y):Math.min(-60,aim.y-h.y),length=Math.hypot(dx,dy),nx=dx/length,ny=dy/length;
  s.wards.push({id:s.nextId++,owner:side,x:h.x+nx*35,y:h.y+ny*35,nx,ny,vx:nx*D.wardSpeed,vy:ny*D.wardSpeed,life:D.shieldTime,spent:false});
  h.cooldown=D.shieldCooldown;announce(s,side?'The wizard sends a curved ward!':'Ward away! Intercept a spell along your aim.','shield');return true;
}
// Rendering and collision share the same curved polyline; no enclosing bubble.
export function wardPoints(w,elapsed=0){return Array.from({length:25},(_,i)=>{const t=i/12-1,along=D.wardDepth*(1-t*t),across=t*D.wardWidth/2;return{x:w.x+w.vx*elapsed+w.nx*along-w.ny*across,y:w.y+w.vy*elapsed+w.ny*along+w.nx*across};});}
export function segmentTOI(p,v,a,b,r,max){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!length)return circleTOI(p,v,a,r,max);
  const tx=dx/length,ty=dy/length,nx=-ty,ny=tx,offset=(p.x-a.x)*nx+(p.y-a.y)*ny,normalV=v.x*nx+v.y*ny,along=(p.x-a.x)*tx+(p.y-a.y)*ty;
  let best=null;const offer=t=>{if(t!==null&&t>=0&&t<=max&&(best===null||t<best))best=t;};
  if(Math.abs(offset)<=r&&along>=0&&along<=length)offer(0);
  if(Math.abs(normalV)>1e-9)for(const sign of [-1,1]){const t=(sign*r-offset)/normalV,q=along+(v.x*tx+v.y*ty)*t;if(q>=0&&q<=length)offer(t);}
  offer(circleTOI(p,v,a,r,max));offer(circleTOI(p,v,b,r,max));return best;
}
export function cast(s,side,aim,power=null){
  const h=s.hats[side];if(s.phase!=='active'||h.castCooldown>0||s.orbs.some(o=>o.caster===side))return false;
  let dx=aim.x-h.x,dy=aim.y-h.y;dy=side?Math.max(60,dy):Math.min(-60,dy);const len=Math.hypot(dx,dy),vx=dx/len,vy=dy/len;
  s.orbs.push({id:s.nextId++,caster:side,owner:side,x:h.x+vx*55,y:h.y+vy*55,vx:vx*D.orbSpeed,vy:vy*D.orbSpeed,life:8,power,banks:power==='electric'?2:0,bounces:0});h.castCooldown=1.1;announce(s,side?'The wizard casts!':'Your spell is away. Protect your hat AND your portal.','cast');return true;
}
function move(h,target,dt,side){const old={x:h.x,y:h.y},dx=target.x-h.x,dy=target.y-h.y,l=Math.hypot(dx,dy),f=l?Math.min(1,D.speed*dt/l):0;h.x=clamp(h.x+dx*f,40,560);h.y=clamp(h.y+dy*f,side?45:425,side?335:715);h.vx=(h.x-old.x)/dt;h.vy=(h.y-old.y)/dt;return old;}
function damage(s,side,amount,kind){const h=s.hats[side];if(!h.immune){h.hp=Math.max(0,h.hp-amount);h.immune=.45;announce(s,`${side?'Wizard':'Your hat'}: ${kind} hit, −${amount} heart${amount>1?'s':''}.`,side?'enemy-hit':'player-hit');}if(h.hp<=0){s.phase='finished';s.winner=1-side;announce(s,side?'You win! The wizard demands a rematch.':'The wizard wins. Another friendly duel?',side?'win':'loss');}}
export function advanceOrb(s,o,dt,old,aim){
  let left=dt,elapsed=0;
  for(let n=0;n<10&&left>1e-7;n++){
    let hit=null;const offer=(t,type,data)=>{if(t!==null&&t>=-1e-7&&t<=left+1e-7&&(!hit||t<hit.t-1e-7))hit={t:Math.max(0,t),type,data};};
    if(o.vx<0)offer((D.orbRadius-o.x)/o.vx,'wall','left');if(o.vx>0)offer((D.width-D.orbRadius-o.x)/o.vx,'wall','right');
    const opening=x=>x>D.goalLeft+D.orbRadius&&x<D.goalRight-D.orbRadius;
    if(o.vy<0){const t=(D.orbRadius-o.y)/o.vy;if(!opening(o.x+o.vx*t))offer(t,'wall','top');const g=-o.y/o.vy;if(opening(o.x+o.vx*g))offer(g,'goal',1);}
    if(o.vy>0){const t=(D.height-D.orbRadius-o.y)/o.vy;if(!opening(o.x+o.vx*t))offer(t,'wall','bottom');const g=(D.height-o.y)/o.vy;if(opening(o.x+o.vx*g))offer(g,'goal',0);}
    for(const x of [D.goalLeft,D.goalRight])for(const y of [0,D.height])offer(circleTOI(o,{x:o.vx,y:o.vy},{x,y},D.orbRadius+6,left),'post',{x,y});
    for(const ward of s.wards)if(!ward.spent&&ward.owner!==o.owner&&ward.life>elapsed){
      const points=wardPoints(ward,elapsed),relative={x:o.vx-ward.vx,y:o.vy-ward.vy};
      for(let i=1;i<points.length;i++)offer(segmentTOI(o,relative,points[i-1],points[i],D.orbRadius+D.wardThickness,Math.min(left,ward.life-elapsed)),'ward',ward);
    }
    for(let side=0;side<2;side++)if(o.owner!==side){const h=s.hats[side],pos={x:old[side].x+(h.vx||0)*elapsed,y:old[side].y+(h.vy||0)*elapsed};offer(circleTOI(o,{x:o.vx-(h.vx||0),y:o.vy-(h.vy||0)},pos,D.orbRadius+D.hatRadius,left),'hat',{side,pos,h});}
    if(!o.power)for(const rune of s.runes)if(rune.cooldown<=0){const vx=rune.sweepVX||0,vy=rune.sweepVY||0,pos={x:rune.x+vx*elapsed,y:rune.y+vy*elapsed};offer(circleTOI(o,{x:o.vx-vx,y:o.vy-vy},pos,32,left),'rune',rune);}
    const t=hit?hit.t:left;o.x+=o.vx*t;o.y+=o.vy*t;elapsed+=t;left-=t;if(!hit)break;
    if(hit.type==='goal'){damage(s,hit.data,(o.power==='fire'?3:2),'portal');return false;}
    if(hit.type==='rune'){o.power=hit.data.type;o.banks=o.power==='electric'?2:0;const speed=o.power==='fire'?470:410,k=speed/Math.hypot(o.vx,o.vy);o.vx*=k;o.vy*=k;hit.data.cooldown=2;announce(s,o.power==='fire'?'Fire rune: faster spell, +1 damage.':'Electric rune: next two side banks turn 45°.','rune');continue;}
    if(hit.type==='ward'){
      const ward=hit.data,speed=Math.min(D.maxSpeed,Math.hypot(o.vx,o.vy)*1.08);o.vx=ward.nx*speed;o.vy=ward.ny*speed;o.owner=ward.owner;o.x+=ward.nx*2;o.y+=ward.ny*2;
      ward.x+=ward.vx*elapsed;ward.y+=ward.vy*elapsed;ward.vx=0;ward.vy=0;ward.spent=true;ward.life=.14;s.parries++;
      announce(s,ward.owner?'The wizard’s ward returned your spell!':'Your travelling ward caught it!','parry');continue;
    }
    if(hit.type==='hat'){damage(s,hit.data.side,o.power==='fire'?2:1,'hat');return false;}
    if(hit.type==='post'){const dx=o.x-hit.data.x,dy=o.y-hit.data.y,l=Math.hypot(dx,dy)||1,nx=dx/l,ny=dy/l,dot=o.vx*nx+o.vy*ny;o.x=hit.data.x+nx*15.01;o.y=hit.data.y+ny*15.01;if(dot<0){o.vx-=2*dot*nx;o.vy-=2*dot*ny;}}
    if(hit.type==='wall'){
      const side=hit.data;if(side==='left'||side==='right'){o.x=side==='left'?9.001:590.999;o.vx=Math.abs(o.vx)*(side==='left'?1:-1);if(o.power==='electric'&&o.banks>0){const v=Math.hypot(o.vx,o.vy)/Math.sqrt(2);o.vx=v*(side==='left'?1:-1);o.vy=v*(o.vy<0?-1:1);if(--o.banks===0)o.power=null;}}
      else{o.y=side==='top'?9.001:750.999;o.vy=Math.abs(o.vy)*(side==='top'?1:-1);}if(++o.bounces>8)return false;
    }
    const escape=Math.min(left,1e-6);o.x+=o.vx*escape;o.y+=o.vy*escape;left-=escape;elapsed+=escape;
  }
  return Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.x>=0&&o.x<=D.width&&o.y>=0&&o.y<=D.height;
}
export function tickDuel(s,dt,input={}){
  if(s.phase==='countdown'){s.countdown-=dt;if(s.countdown<=0)s.phase='active';return;}
  if(s.phase!=='active')return;s.time+=dt;
  for(const h of s.hats)for(const key of ['cooldown','castCooldown','immune'])h[key]=Math.max(0,h[key]-dt);
  for(const r of s.runes){r.cooldown=Math.max(0,r.cooldown-dt);if(r.x+r.vx*dt<75||r.x+r.vx*dt>525)r.vx=-r.vx;if(r.y+r.vy*dt<180||r.y+r.vy*dt>580)r.vy=-r.vy;r.sweepVX=(clamp(r.x+r.vx*dt,75,525)-r.x)/dt;r.sweepVY=(clamp(r.y+r.vy*dt,180,580)-r.y)/dt;}
  if(input.ai!==false){
    s.aiThink-=dt;s.aiCast-=dt;
    if(s.aiThink<=0){s.aiThink=.17;const threats=s.orbs.filter(o=>o.owner===0&&o.vy<0).sort((a,b)=>a.y-b.y),threat=threats[0];s.aiTarget={x:threat?clamp(threat.x+threat.vx*.22,65,535):300,y:145};if(threat&&Math.hypot(threat.x-s.hats[1].x,threat.y-s.hats[1].y)<210)shield(s,1,{x:threat.x+threat.vx*.12,y:threat.y+threat.vy*.12});}
    if(s.aiCast<=0&&!s.windup&&!s.orbs.some(o=>o.caster===1)){s.windup=.55;s.aiAim={x:s.nextId%3===0?300:s.hats[0].x,y:760};s.aiCast=2.1;announce(s,'The wizard’s star is charging…','windup');}
    if(s.windup>0){s.windup-=dt;if(s.windup<=0){s.windup=0;cast(s,1,s.aiAim);}}
  }else s.windup=0;
  const old=[move(s.hats[0],input.target??s.hats[0],dt,0),move(s.hats[1],input.ai!==false?s.aiTarget:s.hats[1],dt,1)];
  const alive=[];for(const orb of s.orbs){orb.life-=dt;if(orb.life>0&&advanceOrb(s,orb,dt,old,input.aim??{x:300,y:0}))alive.push(orb);if(s.phase==='finished')break;}s.orbs=s.phase==='finished'?[]:alive;
  for(const r of s.runes){r.x+=r.sweepVX*dt;r.y+=r.sweepVY*dt;}
  for(const w of s.wards){w.x+=w.vx*dt;w.y+=w.vy*dt;w.life-=dt;}s.wards=s.phase==='finished'?[]:s.wards.filter(w=>w.life>0);
}
