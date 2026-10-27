import {PITCHES,pitchName,blank,sample,paintPath,events,joinAt,splitAt} from './music-model.mjs';
import {NoteTransport} from './music-audio.mjs';
const $=id=>document.getElementById(id), grid=$('grid');
let pattern=blank(), history=[], serial=100, tool='pencil', cursor={step:0,row:14}, gesture=null, transport=null, context=null, enabled=false,lastHead=-2;
const cells=[];
grid.innerHTML='<div class="grid-row" role="row"><span class="step corner" role="columnheader">Pitch</span>'+Array.from({length:16},(_,i)=>`<span class="step" role="columnheader">${i+1}<br>${i%4===0?'Beat '+(i/4+1):'·'}</span>`).join('')+'</div>';
PITCHES.forEach((pitch,row)=>{
  const rowElement=document.createElement('div');rowElement.className='grid-row';rowElement.setAttribute('role','row');grid.append(rowElement);
  const label=document.createElement('span');label.className='pitch';label.textContent=pitchName(pitch);label.setAttribute('role','rowheader');rowElement.append(label);
  for(let step=0;step<16;step++){
    const cell=document.createElement('button');cell.className='cell';cell.setAttribute('role','gridcell');cell.dataset.row=row;cell.dataset.step=step;rowElement.append(cell);cells.push(cell);
  }
});
function stop(message) {transport?.stop();$('play').disabled=!enabled;$('stop').disabled=true;if(message)$('status').textContent=message;render();}
function snapshot(){stop();history.push(structuredClone(pattern));if(history.length>50)history.shift();}
function render(){
  const target=sample(), eventList=events(pattern),head=transport?.step??-1;lastHead=head;
  for(const cell of cells){
    const step=+cell.dataset.step,row=+cell.dataset.row,pitch=PITCHES[row],note=pattern[step],on=note?.pitch===pitch;
    const joined=on&&step>0&&pattern[step-1]?.pitch===pitch&&pattern[step-1]?.stroke===note.stroke;
    const selected=step===cursor.step&&row===cursor.row;
    cell.className=['cell',pitch%12===0?'tonic':'',step%4===0?'beat':'',on?'note-on':'',joined?'joined':'',selected?'cursor':'',step===head?'playhead':'',$('overlay').checked&&target[step]?.pitch===pitch?'target':''].join(' ');
    cell.tabIndex=selected?0:-1;cell.setAttribute('aria-selected',String(on));cell.setAttribute('aria-label',`${pitchName(pitch)}, step ${step+1}, ${on?joined?'held continuation':'note start':'empty'}`);
  }
  $('undo').disabled=!history.length;
  $('notation').textContent=eventList.length?eventList.map(e=>`${pitchName(e.pitch)} at ${e.start+1} (${e.length} step${e.length>1?'s':''})`).join(' · '):'No notes yet.';
}
function position(e){const rect=cells[0].getBoundingClientRect(),last=cells[15].getBoundingClientRect(),bottom=cells.at(-1).getBoundingClientRect();return {step:Math.max(0,Math.min(15,Math.floor((e.clientX-rect.left)/(last.right-rect.left)*16))),row:Math.max(0,Math.min(14,Math.floor((e.clientY-rect.top)/(bottom.bottom-rect.top)*15)))};}
grid.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.cell')||e.button!==0)return;e.preventDefault();snapshot();
  const at=position(e);gesture={id:e.pointerId,last:at,stroke:++serial};cursor=at;grid.setPointerCapture(e.pointerId);paintPath(pattern,at,at,serial,tool==='eraser');render();cells.find(c=>+c.dataset.step===at.step&&+c.dataset.row===at.row).focus({preventScroll:true});
});
grid.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const at=position(e);paintPath(pattern,gesture.last,at,gesture.stroke,tool==='eraser');gesture.last=at;cursor=at;render();});
function finish(e){if(gesture?.id!==e.pointerId)return;gesture=null;$('status').textContent='Pattern edited. Press Play to listen.';render();}
grid.addEventListener('pointerup',finish);grid.addEventListener('pointercancel',finish);grid.addEventListener('lostpointercapture',()=>{gesture=null;});
grid.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Delete','Backspace'].includes(e.key))return;e.preventDefault();
  if(e.key==='ArrowLeft')cursor.step=Math.max(0,cursor.step-1);if(e.key==='ArrowRight')cursor.step=Math.min(15,cursor.step+1);if(e.key==='ArrowUp')cursor.row=Math.max(0,cursor.row-1);if(e.key==='ArrowDown')cursor.row=Math.min(14,cursor.row+1);
  if(e.key==='Enter'){snapshot();pattern[cursor.step]=tool==='eraser'?null:{pitch:PITCHES[cursor.row],stroke:++serial};}
  if(['Delete','Backspace'].includes(e.key)){snapshot();pattern[cursor.step]=null;}
  render();cells.find(c=>+c.dataset.step===cursor.step&&+c.dataset.row===cursor.row).focus({preventScroll:false});
});
for(const t of ['pencil','eraser'])$(t).onclick=()=>{tool=t;for(const id of ['pencil','eraser'])$(id).setAttribute('aria-pressed',String(id===t));};
$('undo').onclick=()=>{stop();pattern=history.pop()??pattern;render();};
$('sample').onclick=()=>{snapshot();pattern=sample();$('status').textContent='Original sample loaded: Little Lantern (preview melody).';render();};
$('clear').onclick=()=>{snapshot();pattern=blank();$('status').textContent='Cleared. Undo restores the pattern.';render();};
$('split').onclick=()=>{snapshot();const ok=splitAt(pattern,cursor.step,++serial);$('status').textContent=ok?'Hold split: a new attack begins here.':'Choose a step inside a hold to split.';render();};
$('join').onclick=()=>{snapshot();const ok=joinAt(pattern,cursor.step);$('status').textContent=ok?'Joined to the previous note.':'Join needs the same pitch in the previous step.';render();};
$('overlay').onchange=render;
$('first').onclick=()=>$('viewport').scrollLeft=0;
$('second').onclick=()=>$('viewport').scrollLeft=cells[8].offsetLeft-42;
$('tempo').oninput=()=>{$('bpm').textContent=$('tempo').value+' BPM';stop('Tempo changed. Press Play to restart.');};
$('loop').onchange=()=>stop('Loop changed. Press Play to restart.');
$('enable').onclick=async()=>{
  try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;context=new Audio();transport=new NoteTransport(context);context.onstatechange=()=>{if(context.state!=='running')stop(enabled?'Audio interrupted. Press Play to resume.':'Sound muted.');};}enabled=!enabled;if(enabled){await context.resume();$('status').textContent='Sound enabled. Press Play.';}else{stop('Sound muted.');await context.suspend();}$('enable').textContent=enabled?'Mute sound':'Enable sound';$('play').disabled=!enabled;}
  catch{$('status').textContent='Audio could not start in this browser. Try another browser.';}
};
$('play').onclick=async()=>{try{await context.resume();transport.start(structuredClone(pattern),+$('tempo').value,$('loop').checked,()=>stop('Finished.'));$('play').disabled=true;$('stop').disabled=false;$('status').textContent='Playing your pattern.';}catch{stop('Playback could not start.');}};
$('stop').onclick=()=>stop('Stopped.');
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Stopped while the tab was hidden.');});
window.addEventListener('blur',()=>{gesture=null;stop('Stopped when the window lost focus.');});
window.addEventListener('pagehide',()=>{transport?.stop();context?.close();});
function frame(){if(transport?.playing&&transport.step!==lastHead)render();requestAnimationFrame(frame);}render();frame();
