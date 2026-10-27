import {RULES as R,createMatch,prepareServe,setPower,tick,clamp} from './hockey-physics.mjs';
const $=id=>document.getElementById(id),canvas=$('table'),ctx=canvas.getContext('2d');
let opening=0,s=createMatch(opening),target={x:300,y:730},aiTarget={x:300,y:170},aiTimer=0,keys=new Set(),drag=null,pausedFrom='rally',last=performance.now(),accumulator=0,lastNotice='',lastPower='';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function sync(){
  $('you').textContent=s.scores[0];$('ai').textContent=s.scores[1];
  $('pause').disabled=['ready','finished'].includes(s.phase);$('pause').textContent=s.phase==='paused'?'Resume':'Pause';$('serve').disabled=s.phase!=='ready';
  $('touch-pause').disabled=$('pause').disabled;$('touch-pause').textContent=s.phase==='paused'?'Resume':'Pause';
  const text=s.phase==='ready'?'Press Serve to begin':s.phase==='paused'?'Paused · press Resume':s.phase==='countdown'?`Serve in ${Math.max(1,Math.ceil(s.countdown))}`:s.phase==='finished'?s.notice:'';
  $('banner').hidden=!text;$('banner').textContent=text;
  if(lastNotice!==s.notice){$('status').textContent=s.notice;lastNotice=s.notice;}
  const power=s.power?`${s.power.type==='fire'?'F · Fire':'E · Electric'} · ${s.power.left.toFixed(1)}s${s.power.type==='electric'?` · ${s.power.banks} banks`:''}`:'○ Plain puck';
  if(lastPower!==power){$('power').textContent=power;lastPower=power;}
  for(const id of ['plain','fire','electric'])$(id).setAttribute('aria-pressed',String((s.power?.type??'plain')===id));
  $('rally').textContent=`Rally: ${s.rally} returns · Best: ${s.bestRally}`;
}
function pause(){if(!['rally','countdown'].includes(s.phase))return;pausedFrom=s.phase;s.phase='paused';keys.clear();drag=null;s.notice='Paused. Press Resume when ready.';sync();}
function resume(){if(s.phase!=='paused')return;s.phase=pausedFrom;if(s.phase==='rally'){s.phase='countdown';s.countdown=1;resumeVelocity={vx:s.puck.vx,vy:s.puck.vy};}s.notice='Resuming with countdown.';canvas.focus();sync();}
let resumeVelocity=null;
$('serve').onclick=()=>{prepareServe(s);target={x:300,y:730};aiTarget={x:300,y:170};canvas.focus();sync();};
$('pause').onclick=()=>s.phase==='paused'?resume():pause();
$('touch-pause').onclick=$('pause').onclick;
$('restart').onclick=()=>{s=createMatch(++opening%2);target={x:300,y:730};aiTarget={x:300,y:170};resumeVelocity=null;keys.clear();sync();draw();};
for(const id of ['plain','fire','electric'])$(id).onclick=()=>{setPower(s,id);sync();draw();};
$('spawns').onchange=()=>{if(!$('spawns').checked)s.pickup=null;};
$('pad-option').onchange=()=>$('pad').hidden=!$('pad-option').checked;
function coords(e){const b=canvas.getBoundingClientRect();return{x:clamp((e.clientX-b.left)/b.width*R.width,34,566),y:clamp((e.clientY-b.top)/b.height*R.height,494,866)};}
for(const surface of [canvas,$('pad')]){
  surface.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();surface.focus({preventScroll:true});surface.setPointerCapture(e.pointerId);drag={id:e.pointerId,surface,x:e.clientX,y:e.clientY,start:{...target}};if(surface===canvas)target=coords(e);});
  surface.addEventListener('pointermove',e=>{if(surface===canvas&&e.pointerType==='mouse'&&!drag){target=coords(e);return;}if(!drag||e.pointerId!==drag.id)return;if(surface===canvas)target=coords(e);else{const scale=R.width/canvas.getBoundingClientRect().width;target={x:clamp(drag.start.x+(e.clientX-drag.x)*scale,34,566),y:clamp(drag.start.y+(e.clientY-drag.y)*scale,494,866)};}});
  surface.addEventListener('pointerup',()=>{drag=null;});surface.addEventListener('pointercancel',pause);surface.addEventListener('lostpointercapture',()=>{drag=null;});
}
const movement=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'];
for(const surface of [canvas,$('pad')])surface.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key===' '){e.preventDefault();s.phase==='paused'?resume():pause();}if(movement.includes(key)){e.preventDefault();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('focusout',e=>{const game=document.querySelector('.window');if(game.contains(e.target)&&!game.contains(e.relatedTarget))pause();});
function simulation(dt){
  if(s.phase==='rally'){
    let dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')),dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
    if(dx||dy){const length=Math.hypot(dx,dy);target={x:s.player.x+dx/length*R.strikerSpeed*dt,y:s.player.y+dy/length*R.strikerSpeed*dt};}
    aiTimer-=dt;
    if(aiTimer<=0){const easy=$('difficulty').value==='easy',horizon=easy?.12:.24;aiTimer=easy?.22:.13;const incoming=s.puck.vy<0;aiTarget={x:incoming?clamp(s.puck.x+s.puck.vx*horizon+(Math.random()-.5)*(easy?60:28),45,555):300,y:incoming?clamp(s.puck.y-65,100,350):170};}
  }
  const before=s.phase;tick(s,dt,{player:target,ai:aiTarget,aiSpeed:$('difficulty').value==='easy'?330:480},$('spawns').checked);
  if(before==='countdown'&&s.phase==='rally'&&resumeVelocity){Object.assign(s.puck,resumeVelocity);resumeVelocity=null;}
  if(before==='rally'&&s.phase==='countdown'){target={x:300,y:730};aiTarget={x:300,y:170};resumeVelocity=null;}
}
function circle(x,y,r,fill,stroke='#161a2e',width=3){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
function draw(){
  const dark=matchMedia('(prefers-color-scheme: dark)').matches,ink=dark?'#d9d3eb':'#161a2e';ctx.clearRect(0,0,600,900);ctx.fillStyle=dark?'#24273a':'#fffdf8';ctx.fillRect(0,0,600,900);
  ctx.strokeStyle=dark?'#656078':'#c5c8d6';ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.beginPath();ctx.moveTo(0,450);ctx.lineTo(600,450);ctx.stroke();ctx.setLineDash([]);circle(300,450,85,'transparent',dark?'#656078':'#c5c8d6',2);
  ctx.strokeStyle=ink;ctx.lineWidth=9;for(const y of [0,900]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(200,y);ctx.moveTo(400,y);ctx.lineTo(600,y);ctx.stroke();circle(200,y,6,ink,ink);circle(400,y,6,ink,ink);}ctx.fillStyle='#ae9df3';ctx.fillRect(210,0,180,8);ctx.fillStyle='#5ac8b6';ctx.fillRect(210,892,180,8);
  if(s.pickup){ctx.setLineDash(s.pickup.age<.6?[5,5]:[]);circle(s.pickup.x,s.pickup.y,20,s.pickup.age<.6?'transparent':s.pickup.type==='fire'?'#f98776':'#feda74',ink,2);ctx.setLineDash([]);ctx.fillStyle=ink;ctx.font='bold 20px Inter';ctx.textAlign='center';ctx.fillText(s.pickup.type==='fire'?'F':'E',s.pickup.x,s.pickup.y+7);}
  const p=s.puck;
  if(s.power?.type==='electric'&&Math.abs(p.vx)>1){const wall=p.vx<0?12:588,t=(wall-p.x)/p.vx,y=p.y+p.vy*t;if(t>=0&&t<.75&&y>20&&y<880){ctx.strokeStyle=dark?'#feda74':'#8a6400';ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(wall,y);ctx.lineTo(wall+(p.vx<0?100:-100),y+100*(Math.abs(p.vy)>5?Math.sign(p.vy):s.lastVertical));ctx.stroke();ctx.setLineDash([]);}}
  for(const [side,colour] of [['ai','#ae9df3'],['player','#5ac8b6']]){const b=s[side];circle(b.x,b.y,34,colour);circle(b.x,b.y,15,'transparent');}
  circle(p.x,p.y,12,s.power?.type==='fire'?'#f98776':s.power?.type==='electric'?'#feda74':dark?'#fef6fe':'#161a2e',s.power?'#161a2e':ink,2);
  if(s.power){ctx.font='bold 14px Inter';ctx.fillStyle='#161a2e';ctx.textAlign='center';ctx.fillText(s.power.type==='fire'?'F':'E',p.x,p.y+5);}
  // No shake, flashing or trails; reduced motion keeps the same physics.
  if(!reduced&&drag){ctx.strokeStyle=dark?'#c5c8d6':'#73768b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(target.x,target.y,7,0,Math.PI*2);ctx.stroke();}
}
function frame(now){accumulator+=Math.min(.05,(now-last)/1000);last=now;while(accumulator>=R.dt){simulation(R.dt);accumulator-=R.dt;}draw();sync();requestAnimationFrame(frame);}sync();draw();requestAnimationFrame(frame);
