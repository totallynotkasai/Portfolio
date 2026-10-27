// Fixed logical units; projection/resizing never changes simulation speed.
export const RULES={width:600,height:900,puckRadius:12,strikerRadius:34,goalLeft:200,goalRight:400,speed:700,strikerSpeed:560,dt:1/120};
const R=RULES,EPS=1e-6;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const magnitude=b=>Math.hypot(b.vx,b.vy);
function cap(body,max){const speed=magnitude(body);if(speed>max){body.vx*=max/speed;body.vy*=max/speed;}}
export function createMatch(opening=0){
  const s={player:{x:300,y:730,vx:0,vy:0},ai:{x:300,y:170,vx:0,vy:0},puck:{x:300,y:450,vx:0,vy:0},scores:[0,0],phase:'ready',countdown:1.2,serveTo:opening,power:null,pickup:null,spawnIn:8,activeTime:0,rally:0,bestRally:0,lastVertical:1,opening,notice:'Press Serve to begin.'};
  return s;
}
export function legalStriker(body,side){const margin=R.strikerRadius+2*R.puckRadius+1;body.x=clamp(body.x,margin,R.width-margin);body.y=clamp(body.y,side==='player'?R.height/2+44:margin,side==='player'?R.height-margin:R.height/2-44);}
export function moveStriker(body,target,dt,side,max=R.strikerSpeed){
  const old={x:body.x,y:body.y},dx=target.x-body.x,dy=target.y-body.y,d=Math.hypot(dx,dy),f=d?Math.min(1,max*dt/d):0;
  body.x+=dx*f;body.y+=dy*f;legalStriker(body,side);body.vx=(body.x-old.x)/dt;body.vy=(body.y-old.y)/dt;
  return old;
}
export function setPower(s,type){s.pickup=null;s.power=type==='plain'?null:{type,left:type==='fire'?5:6,banks:2};s.notice=type==='plain'?'Plain puck.':type==='fire'?'Fire: stronger next return + small recoil.':'Electric: two 45° banks or an angled return.';}
export function prepareServe(s,side=s.serveTo){
  Object.assign(s.player,{x:300,y:730,vx:0,vy:0});Object.assign(s.ai,{x:300,y:170,vx:0,vy:0});
  Object.assign(s.puck,{x:300,y:450,vx:0,vy:0});s.power=null;s.pickup=null;s.spawnIn=8;s.serveTo=side;s.countdown=1.2;s.phase='countdown';s.rally=0;s.notice=side===0?'Serving toward you.':'Serving toward the AI.';
}
// Earliest circle contact, including relative moving-striker velocity.
export function circleTOI(p,v,c,r,max){
  const dx=p.x-c.x,dy=p.y-c.y,a=v.x*v.x+v.y*v.y,b=2*(dx*v.x+dy*v.y),cc=dx*dx+dy*dy-r*r;
  if(cc<-.001)return 0;
  if(a<EPS||b>=0)return null;
  const disc=b*b-4*a*cc;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);return t>=-EPS&&t<=max+EPS?Math.max(0,t):null;
}
function sideBank(s,side){
  const p=s.puck,power=s.power;
  p.vx=Math.abs(p.vx)*(side==='left'?1:-1);
  if(power?.type==='fire'){const speed=Math.min(magnitude(p)*1.1,R.speed*1.3),f=speed/(magnitude(p)||1);p.vx*=f;p.vy*=f;}
  if(power?.type==='electric'){
    const v=magnitude(p)/Math.sqrt(2);p.vx=v*(side==='left'?1:-1);p.vy=v*(Math.abs(p.vy)>5?Math.sign(p.vy):s.lastVertical);
    if(--power.banks===0){s.power=null;s.notice='Electric discharged after two side banks.';}
  }
}
function score(s,side){s.scores[side]++;s.bestRally=Math.max(s.bestRally,s.rally);const winner=s.scores[side]>=5;prepareServe(s,side===0?1:0);s.phase=winner?'finished':'countdown';s.notice=winner?(side===0?'You win!':'AI wins!'):(side===0?'Your goal!':'AI goal!');}
export function advancePuck(s,dt,oldPositions={player:s.player,ai:s.ai}){
  const p=s.puck;let remaining=dt,elapsed=0;
  const posts=[{x:R.goalLeft,y:0},{x:R.goalRight,y:0},{x:R.goalLeft,y:R.height},{x:R.goalRight,y:R.height}];
  for(let iteration=0;iteration<12&&remaining>EPS;iteration++){
    let hit=null;
    const offer=(time,type,other=null)=>{if(time!==null&&time>=-EPS&&time<=remaining+EPS&&(!hit||time<hit.time-EPS))hit={time:Math.max(0,time),type,other};};
    if(p.vx<0)offer((R.puckRadius-p.x)/p.vx,'left');if(p.vx>0)offer((R.width-R.puckRadius-p.x)/p.vx,'right');
    const goalInside=x=>x>R.goalLeft+R.puckRadius&&x<R.goalRight-R.puckRadius;
    if(p.vy<0){const t=(R.puckRadius-p.y)/p.vy;if(!goalInside(p.x+p.vx*t))offer(t,'top');const g=(0-p.y)/p.vy;if(goalInside(p.x+p.vx*g))offer(g,'goal',0);}
    if(p.vy>0){const t=(R.height-R.puckRadius-p.y)/p.vy;if(!goalInside(p.x+p.vx*t))offer(t,'bottom');const g=(R.height-p.y)/p.vy;if(goalInside(p.x+p.vx*g))offer(g,'goal',1);}
    for(const post of posts)offer(circleTOI(p,{x:p.vx,y:p.vy},post,R.puckRadius+6,remaining),'post',post);
    for(const side of ['player','ai']){
      const b=s[side],old=oldPositions[side],at={x:old.x+b.vx*elapsed,y:old.y+b.vy*elapsed};
      offer(circleTOI(p,{x:p.vx-b.vx,y:p.vy-b.vy},at,R.puckRadius+R.strikerRadius,remaining),'striker',{side,at,b});
    }
    if(s.pickup?.age>=.6)offer(circleTOI(p,{x:p.vx,y:p.vy},s.pickup,30,remaining),'pickup');
    const travel=hit?hit.time:remaining;p.x+=p.vx*travel;p.y+=p.vy*travel;elapsed+=travel;remaining-=travel;
    if(!hit)break;
    if(hit.type==='goal'){score(s,hit.other);return;}
    if(hit.type==='pickup'){const type=s.pickup.type;setPower(s,type);continue;}
    if(hit.type==='left'||hit.type==='right'){p.x=hit.type==='left'?R.puckRadius+.001:R.width-R.puckRadius-.001;sideBank(s,hit.type);}
    else if(hit.type==='top'||hit.type==='bottom'){p.y=hit.type==='top'?R.puckRadius+.001:R.height-R.puckRadius-.001;p.vy=Math.abs(p.vy)*(hit.type==='top'?1:-1);}
    else{
      const striker=hit.type==='striker',b=striker?hit.other.b:{vx:0,vy:0},center=striker?{x:hit.other.at.x+b.vx*travel,y:hit.other.at.y+b.vy*travel}:hit.other;
      let dx=p.x-center.x,dy=p.y-center.y,dist=Math.hypot(dx,dy);if(dist<EPS){dx=0;dy=striker&&hit.other.side==='player'?-1:1;dist=1;}
      const nx=dx/dist,ny=dy/dist,r=R.puckRadius+(striker?R.strikerRadius:6);
      p.x=center.x+nx*(r+.01);p.y=center.y+ny*(r+.01);
      const dot=(p.vx-b.vx)*nx+(p.vy-b.vy)*ny;
      if(dot<0){
        p.vx-=2*dot*nx;p.vy-=2*dot*ny;
        if(striker){
          const power=s.power?.type;
          p.vx+=b.vx*.3*(power==='electric'?1.25:1);p.vy+=b.vy*.15;
          let speed=clamp(magnitude(p)*(power==='fire'?1.18:1),260,R.speed*(power==='fire'?1.4:1));
          // Bound the return angle around the contact normal, so side/rear
          // contacts remain physical and cannot be redirected into the body.
          const tangent=clamp(-p.vx*ny+p.vy*nx,-speed*.94,speed*.94);
          const outward=Math.sqrt(speed*speed-tangent*tangent);
          p.vx=nx*outward-ny*tangent;p.vy=ny*outward+nx*tangent;
          if(power==='fire'){b.x-=nx*12;b.y-=ny*12;legalStriker(b,hit.other.side);s.notice='Fire return: power spent; small recoil.';}
          else if(power==='electric')s.notice='Electric return: sideways motion amplified; power spent.';
          if(power)s.power=null;s.rally++;s.bestRally=Math.max(s.bestRally,s.rally);
        }
      }
    }
    if(Math.abs(p.vy)>5)s.lastVertical=Math.sign(p.vy);
    cap(p,R.speed*1.4);
    // Consume a tiny interval after contact to avoid repeated zero-time hits.
    const escape=Math.min(remaining,1e-6);p.x+=p.vx*escape;p.y+=p.vy*escape;remaining-=escape;elapsed+=escape;
  }
  const drag=Math.exp(-.025*dt);p.vx*=drag;p.vy*=drag;
}
export function tick(s,dt,targets,spawn=true,rng=Math.random){
  if(!['rally','countdown'].includes(s.phase))return;
  if(s.phase==='countdown'){
    s.countdown-=dt;if(s.countdown<=0){s.phase='rally';s.puck.vx=(s.opening%2?1:-1)*90;s.puck.vy=s.serveTo===0?270:-270;s.notice='Rally!';}return;
  }
  const old={player:moveStriker(s.player,targets.player,dt,'player'),ai:moveStriker(s.ai,targets.ai,dt,'ai',targets.aiSpeed??R.strikerSpeed)};
  s.activeTime+=dt;
  if(s.power){s.power.left-=dt;if(s.power.left<=0){s.power=null;s.notice='Power expired.';}}
  else if(spawn&&!s.pickup){
    s.spawnIn-=dt;
    if(s.spawnIn<=0){
      const candidate={x:150+rng()*300,y:345+rng()*210,type:rng()<.5?'fire':'electric',age:0};
      if(Math.hypot(candidate.x-s.puck.x,candidate.y-s.puck.y)>100&&['player','ai'].every(side=>Math.hypot(candidate.x-s[side].x,candidate.y-s[side].y)>100))s.pickup=candidate;
      s.spawnIn=10+rng()*4;
    }
  }
  if(s.pickup){s.pickup.age+=dt;if(s.pickup.age>6.6){s.pickup=null;s.spawnIn=10+rng()*4;}}
  advancePuck(s,dt,old);
}
