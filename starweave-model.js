// Starweave v1. Explicit MIDI pitches survive every palette change.
export const RUNES = Object.freeze({
  star: { symbol: '✧', name: 'Star chime', colour: '#feda74', word: 'bright bells' },
  ember: { symbol: '△', name: 'Ember pluck', colour: '#f98776', word: 'little sparks' },
  moon: { symbol: '☾', name: 'Moon hum', colour: '#ae9df3', word: 'sleepy moonlight' },
});
export const PALETTES = Object.freeze({
  'C major': [60,64,67,72], 'C minor': [60,63,67,72], 'D minor': [62,65,69,74],
  'F major': [60,65,69,72], 'G major': [59,62,67,71], 'C pentatonic': [60,62,67,69],
});
export const KEY = 'kasai:starweave:v1';
export const MAX_TEXT = 80000;
export const clone = value => structuredClone(value);
export const pitchName = p => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][p % 12] + (Math.floor(p / 12) - 1);
let serial = 0;
export const uid = () => globalThis.crypto?.randomUUID?.() || `r${Date.now().toString(36)}-${++serial}`;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const fail = message => { throw new Error(message); };
function fields(v, allowed, label) {
  if (!object(v)) fail(`${label} must be an object.`);
  for (const key of Object.keys(v)) if (!allowed.includes(key)) fail(`${label}: unknown field "${key}".`);
}
export function validate(value) {
  fields(value, ['format','version','title','tempo','loop','bars','palette','notes'], 'Pattern');
  if (value.format !== 'starweave' || value.version !== 1) fail('Unsupported pattern format/version. Use a Starweave version 1 file.');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80) fail('Title must contain 1–80 characters.');
  if (!int(value.tempo, 50, 160)) fail('Tempo must be a whole number from 50 to 160 BPM.');
  if (typeof value.loop !== 'boolean' || !int(value.bars, 1, 8)) fail('Use a true/false loop and 1–8 circles.');
  if (!Array.isArray(value.palette) || value.palette.length !== 4 || !value.palette.every(p => int(p,48,84)) || !value.palette.every((p,i,a) => !i || p > a[i-1])) fail('Pitch rings must be four ascending, distinct MIDI pitches from 48 to 84.');
  if (!Array.isArray(value.notes) || value.notes.length > value.bars * 16) fail('Notes must be an array, with at most one start per moment.');
  const ids = new Set(), starts = new Set();
  for (const n of value.notes) {
    fields(n, ['id','rune','pitch','start','duration'], 'Note');
    if (typeof n.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) || ids.has(n.id)) fail('Every note needs a unique stable ID (letters, numbers, _ or -).');
    if (!Object.hasOwn(RUNES,n.rune) || !int(n.pitch,48,84)) fail('Note rune or MIDI pitch is invalid.');
    if (!int(n.start,0,value.bars*16-1) || starts.has(n.start)) fail('Each note needs a unique start inside the composition.');
    if (![1,2,4].includes(n.duration) || n.start+n.duration > value.bars*16) fail('Note duration must be 1, 2 or 4 moments and end inside the composition.');
    ids.add(n.id); starts.add(n.start);
  }
  const result = clone(value);
  result.title = result.title.trim();
  result.notes.sort((a,b) => a.start-b.start);
  return result;
}
export const blank = () => ({ format:'starweave', version:1, title:'My musical spell', tempo:90, loop:true, bars:1, palette:[60,64,67,72], notes:[] });
export function parse(text) {
  if (typeof text !== 'string' || text.length > MAX_TEXT) fail('Pattern JSON is too large (80,000 characters maximum).');
  let value;
  try { value = JSON.parse(text); } catch { fail('JSON could not be read. Check brackets, commas and quoted field names. Your spell is unchanged.'); }
  return validate(value);
}
export const stringify = p => JSON.stringify(validate(p), null, 2);
export function place(pattern, start, rune, pitch, duration) {
  const p = clone(pattern), old = p.notes.find(n => n.start === start);
  p.notes = p.notes.filter(n => n.start !== start);
  p.notes.push({ id:old?.id || uid(), rune, pitch, start, duration });
  return validate(p);
}
export function erase(pattern, start) { const p=clone(pattern); p.notes=p.notes.filter(n=>n.start!==start); return validate(p); }
export function palette(pattern, pitches) { return validate({ ...pattern, palette:pitches }); }
export function resize(pattern, bars) {
  if(int(bars,1,8) && bars<pattern.bars && pattern.notes.some(n=>n.start+n.duration>bars*16)) fail('The last circle still contains notes or a continuing hold. Clear those moments before removing it.');
  return validate({ ...pattern, bars });
}
export function point(step, pitch, pitches) {
  const a=step/16*Math.PI*2-Math.PI/2, index=pitches.indexOf(pitch), r=index<0?204:92+index*30;
  return { x:250+Math.cos(a)*r, y:250+Math.sin(a)*r, outside:index<0 };
}
export function cell(x,y,pitches) {
  const dx=x-250,dy=y-250,r=Math.hypot(dx,dy);
  if(r<66 || r>198) return null;
  return { moment:Math.round(((Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16, pitch:pitches[Math.max(0,Math.min(3,Math.round((r-92)/30)))] };
}
export const RECIPE_NAMES = { starlight:'Starlight greeting', lullaby:'Wizard’s lullaby', embers:'Mischievous embers' };
// Original agent-created phrases, retained from the accepted preview; freely remixable.
export function recipe(name='starlight') {
  if (!Object.hasOwn(RECIPE_NAMES,name)) fail('Unknown recipe.');
  let p=blank(); p.title=RECIPE_NAMES[name];
  const pitches=name==='lullaby'?[67,64,60,64,67,72,67,60]:name==='embers'?[60,67,72,67,64,67,60,72]:[60,64,67,72,67,64,60,67];
  pitches.forEach((pitch,i)=>{p=place(p,i*2,name==='lullaby'?'moon':name==='embers'?(i%2?'star':'ember'):(i%3?'star':'moon'),pitch,name==='lullaby'?2:1);});
  return p;
}
export const TUNES = [
  { id:'bell', name:'Four little bells', rune:'star', pitches:[60,64,67,60], starts:[0,4,8,12], durations:[1,1,2,4] },
  { id:'spark', name:'Spark and answer', rune:'ember', pitches:[67,60,64,72], starts:[0,2,6,10], durations:[2,1,2,4] },
  { id:'moon', name:'Moon steps home', rune:'moon', pitches:[72,67,64,60], starts:[0,4,8,12], durations:[4,2,2,4] },
];
export function tune(id) {
  const t=TUNES.find(t=>t.id===id); if(!t) fail('Unknown tune.');
  let p=blank(); p.title=t.name; p.loop=false;
  t.pitches.forEach((pitch,i)=>{p=place(p,t.starts[i],t.rune,pitch,t.durations[i]);});
  return p;
}
export function match(attempt, target) {
  const a=validate(attempt),t=validate(target);
  const same=(n,m)=>n.start===m.start && n.pitch===m.pitch && n.duration===m.duration && n.rune===m.rune;
  const correct=t.notes.filter(n=>a.notes.some(m=>same(n,m))).length;
  return { correct, total:t.notes.length, extra:a.notes.filter(n=>!t.notes.some(m=>same(n,m))).length, complete:a.bars===t.bars && correct===t.notes.length && a.notes.length===t.notes.length };
}
export function readLibrary(text) {
  if (text == null) return { library:{version:1, autosave:null, saves:[], deleted:null}, warning:'' };
  let raw;
  try { if(text.length>3000000) fail('Too large'); raw=JSON.parse(text); if(raw.version!==1 || !Array.isArray(raw.saves) || raw.saves.length>24) fail('Unknown storage format'); }
  catch { return { library:{version:1,autosave:null,saves:[],deleted:null}, warning:'Saved library could not be read. It has been left untouched. Export your current spell before resetting local saves.', blocked:true }; }
  let warning='';
  const safely=p=>{try{return validate(p);}catch{warning='Some saved data is invalid and has been left untouched. Valid named patterns remain available; export your spell before resetting local saves.';return null;}};
  const seen=new Set();
  const entry=s=>{
    if(!object(s)||typeof s.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(s.id)||seen.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>80){warning='Some saved entries are invalid. Export your spell before resetting local saves.';return null;}
    const pattern=safely(s.pattern); if(!pattern)return null; seen.add(s.id); return {id:s.id,name:s.name.trim(),pattern};
  };
  const autosave=raw.autosave==null?null:safely(raw.autosave), saves=raw.saves.map(entry).filter(Boolean),deleted=raw.deleted==null?null:entry(raw.deleted);
  return { library:{version:1,autosave,saves,deleted}, warning, blocked:!!warning };
}
export function saveNamed(library,name,pattern,replaceId=null) {
  name=name.trim();if(!name||name.length>80)fail('Give this pattern a name of 1–80 characters.');
  const lib=clone(library), duplicate=lib.saves.find(s=>s.name.toLowerCase()===name.toLowerCase() && s.id!==replaceId);
  if(duplicate)fail('That name is already saved. Select it and use Replace selected, or choose another name.');
  const item={id:replaceId||uid(),name,pattern:validate(pattern)};
  if(replaceId){const index=lib.saves.findIndex(s=>s.id===replaceId);if(index<0)fail('Select a saved pattern first.');lib.saves[index]=item;}
  else {if(lib.saves.length>=24)fail('Your library holds 24 patterns. Export or delete one first.');lib.saves.push(item);}
  return { library:lib, id:item.id };
}
