export const RUNES={star:{symbol:'✧',name:'Star chime',colour:'#feda74',word:'bright bells'},ember:{symbol:'△',name:'Ember pluck',colour:'#f98776',word:'little sparks'},moon:{symbol:'☾',name:'Moon hum',colour:'#ae9df3',word:'sleepy moonlight'}};
export const NOTES=[60,64,67,72],NAMES=['C4','E4','G4','C5'];
export const emptyCircle=()=>Array(16).fill(null);
export function placeRune(pattern,step,rune,pitch,length=1){if(!Number.isInteger(step)||step<0||step>15||!RUNES[rune]||!NOTES.includes(pitch))return false;pattern[step]={rune,pitch,length:Math.min(16-step,Math.max(1,Math.min(4,Math.round(length))))};return true;}
export function circleEvents(pattern){return pattern.flatMap((note,start)=>note?[{...note,start,length:Math.min(note.length,16-start)}]:[]);}
export function circlePoint(step,pitch){const a=step/16*Math.PI*2-Math.PI/2,r=92+NOTES.indexOf(pitch)*30;return{x:250+Math.cos(a)*r,y:250+Math.sin(a)*r};}
export function circleCell(x,y){const dx=x-250,dy=y-250,r=Math.hypot(dx,dy);if(r<66||r>220)return null;return{step:Math.round(((Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16,pitch:NOTES[Math.max(0,Math.min(3,Math.round((r-92)/30)))]};}
export function recipe(name='starlight'){const p=emptyCircle(),notes=name==='lullaby'?[67,64,60,64,67,72,67,60]:name==='embers'?[60,67,72,67,64,67,60,72]:[60,64,67,72,67,64,60,67];notes.forEach((pitch,i)=>placeRune(p,i*2,name==='lullaby'?'moon':name==='embers'?(i%2?'star':'ember'):(i%3?'star':'moon'),pitch,name==='lullaby'?2:1));return p;}
