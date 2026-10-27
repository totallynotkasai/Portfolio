// No DOM/audio dependencies: the drawing model can move into the eventual app.
export const PITCHES = [84,83,81,79,77,76,74,72,71,69,67,65,64,62,60];
export const pitchName = midi => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12] + (Math.floor(midi / 12) - 1);
export const blank = () => Array(16).fill(null);
export const sample = () => [60,64,67,67,69,67,null,64,65,65,64,62,60,60,60,null].map((pitch,i) => pitch === null ? null : ({pitch, stroke: [3,9,13,14].includes(i) ? (i === 14 ? 12 : i-1) : i}));
export function paintPath(pattern, from, to, stroke, erase = false) {
  const distance = Math.abs(to.step - from.step);
  for (let k=0;k<=distance;k++) {
    const f = distance ? k/distance : 1;
    const step = Math.round(from.step + (to.step-from.step)*f);
    const row = Math.round(from.row + (to.row-from.row)*f);
    if (step>=0 && step<16 && row>=0 && row<PITCHES.length) {
      if(erase){if(pattern[step]?.pitch===PITCHES[row])pattern[step]=null;}
      else pattern[step]={pitch:PITCHES[row],stroke};
    }
  }
  return pattern;
}
export function events(pattern) {
  const out=[];
  pattern.forEach((cell,step) => {
    if (!cell) return;
    const last = out.at(-1);
    if (last && last.start+last.length === step && last.pitch === cell.pitch && last.id === cell.stroke) last.length++;
    else out.push({id:cell.stroke,start:step,length:1,pitch:cell.pitch});
  });
  return out;
}
export function joinAt(pattern,step) {
  const cell=pattern[step], prev=pattern[step-1];
  if (!cell || !prev || cell.pitch!==prev.pitch) return false;
  const run=events(pattern).find(e=>e.start<=step && e.start+e.length>step);
  for(let i=step;i<run.start+run.length;i++) pattern[i]={...pattern[i],stroke:prev.stroke};
  return true;
}
export function splitAt(pattern,step,id) {
  const run=events(pattern).find(e=>e.start<step && e.start+e.length>step);
  if (!run) return false;
  for(let i=step;i<run.start+run.length;i++) pattern[i]={...pattern[i],stroke:id};
  return true;
}
