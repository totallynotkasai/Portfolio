import {RUNES,PALETTES,KEY,MAX_TEXT,clone,pitchName,blank,validate,parse,stringify,place,erase,palette,resize,point,cell,recipe,RECIPE_NAMES,TUNES,tune,match,readLibrary,saveNamed} from './starweave-model.js';
import {Playback} from './starweave-audio.js';

let live=null;
export function mount(win) { if(live)live.dispose();live=createView(win); }
export function unmount(win) { if(live?.win===win){live.dispose();live=null;} }

function createView(win) {
  const K=window.Kasai, body=win.body, esc=K.esc, abort=new AbortController(), cleanups=[],urls=new Set();
  let mounted=true,raw=null,storageError='';
  try{raw=localStorage.getItem(KEY);}catch{storageError='Local storage is unavailable. Export JSON to keep your spell.';}
  const loaded=readLibrary(raw);
  let library=loaded.library,blocked=loaded.blocked||!!storageError,pattern=clone(library.autosave||recipe()),history=[],challenge=null;
  let page=0,cursor=0,rune='star',pitch=pattern.palette[2],duration=1,eraser=false,raf=0,lastStep=-2,revision=0,fileGeneration=0,selected='',resetArmed=false;
  body.innerHTML=`<div class="st-app">
    <h2 id="${win.headingId}" tabindex="-1">Starweave</h2><p>Leave a bell, a spark, a little moon. The wizard follows your circle, and your spell becomes a song.</p>
    <div class="st-transport"><button type="button" data-sound></button><button type="button" data-play>Cast the song</button><button type="button" data-stop disabled>Stop</button><label><input type="checkbox" data-loop> Repeat ritual</label><label>Pace <input type="range" min="50" max="160" step="1" data-tempo><output data-bpm></output></label></div>
    <p class="st-status" data-status role="status">Pick an ingredient, then a moment.</p>
    <div class="st-layout"><section class="st-workspace" aria-label="Musical spell circle">
      <div class="st-row"><label>Circle <select data-page></select></label><button type="button" data-add>Add circle</button><button type="button" data-remove>Remove last empty circle</button></div>
      <div class="st-row st-quick"><label>Ingredient <select data-rune>${Object.entries(RUNES).map(([id,r])=>`<option value="${id}">${r.symbol} ${r.name}</option>`).join('')}</select></label><label>Pitch <select data-pitch></select></label><label>Let it ring <select data-duration><option value="1">1 moment</option><option value="2">2 moments</option><option value="4">4 moments</option></select></label></div>
      <div class="st-stage"><svg data-circle viewBox="0 0 500 500" role="img" aria-label="Sixteen clockwise moments. Inner to outer rings sound low to high. Use the numbered controls for equivalent editing."></svg><div class="st-conductor" aria-hidden="true"></div><span class="st-orbit" aria-hidden="true" hidden>✦</span></div>
      <p class="st-speech" data-speech>The wizard is ready to conduct.</p><p data-position class="st-position">Star resting.</p>
      <p class="st-hint">Clockwise means later; outer rings sound higher. Sixteen moments make four beats. Tap a rune to replace it. Numbered controls do the same. Left/Right chooses a moment, Up/Down selects a pitch, Enter places, Delete erases.</p>
      <div class="st-moments" role="group" aria-label="Numbered musical moments"></div>
      <p data-kept class="st-hint"></p><div class="st-row"><button type="button" data-erase aria-pressed="false">Eraser</button><button type="button" data-undo disabled>Undo</button><button type="button" data-clear>Clear this circle</button><button type="button" data-new>New blank spell</button></div>
    </section><aside class="st-tools" aria-label="Ingredients and patterns">
      <h3>Your ingredients</h3><div class="st-palette">${Object.entries(RUNES).map(([id,r])=>`<button type="button" data-ingredient="${id}" style="--rune:${r.colour}" aria-pressed="false"><span>${r.symbol}</span><strong>${r.name}</strong><small>${r.word}</small></button>`).join('')}</div>
      <label>Pitch palette <select data-scale><option value="">Custom rings</option>${Object.keys(PALETTES).map(s=>`<option>${s}</option>`).join('')}</select></label><details><summary>Edit the four pitch rings</summary><p class="st-hint">Choose ascending pitches. Existing notes always keep their exact pitches.</p><div class="st-custom">${[0,1,2,3].map(i=>`<label>Ring ${i+1}<select data-ring="${i}">${Array.from({length:37},(_,j)=>`<option value="${j+48}">${pitchName(j+48)}</option>`).join('')}</select></label>`).join('')}</div><button type="button" data-apply-rings>Apply rings</button></details>
      <p class="st-hint">One, two or four moments per rune. Holds may overlap later attacks and continue into the next circle. They must end inside the whole spell.</p>
      <h3>A recipe to remix</h3><div class="st-recipes">${Object.entries(RECIPE_NAMES).map(([id,name])=>`<button type="button" data-recipe="${id}">${name}</button>`).join('')}</div><p class="st-hint">Original little phrases, freely remixable. Try changing an ingredient and listen to its new voice.</p>
      <details class="st-activity"><summary>Match the tune</summary><p>Listen, then rebuild four notes with the same ingredient, pitch, start and duration. Your own spell waits safely while you try. No timer or sound is required to use the written hint.</p><label>Tune <select data-tune>${TUNES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label><button type="button" data-begin>Try this tune</button><div data-challenge hidden><p data-goal></p><div class="st-row"><button type="button" data-listen>Listen to target</button><button type="button" data-hint>Show written hint</button><button type="button" data-check>Check my tune</button><button type="button" data-leave>Return to my spell</button></div><p data-hint-text hidden></p><p data-result role="status"></p></div></details>
    </aside></div>
    <section class="st-library" aria-label="Save and export"><h3>Keep your spell</h3><p class="st-storage" data-storage role="status"></p><div class="st-row"><label>Spell title <input data-title maxlength="80"></label><button type="button" data-set-title>Set title</button><label>Pattern name <input data-name maxlength="80" placeholder="Name a pattern"></label><button type="button" data-save>Save new pattern</button></div>
      <div class="st-row"><label>Named patterns <select data-saved><option value="">Choose a pattern</option></select></label><button type="button" data-load>Load selected</button><button type="button" data-replace>Replace selected</button><button type="button" data-delete>Delete selected</button><button type="button" data-restore>Undo last deletion</button></div>
      <details><summary>JSON import and export</summary><p>Export a backup, or edit the JSON below and apply it. Invalid data leaves your spell unchanged. Undo restores the spell before an import.</p><div class="st-row"><button type="button" data-show-json>Put current spell in editor</button><button type="button" data-json-download>Download JSON</button><label>Read JSON file <input type="file" accept=".json,application/json" data-file></label></div><label class="st-json-label">Editable pattern JSON<textarea data-json spellcheck="false" rows="10" maxlength="${MAX_TEXT}" placeholder="Paste Starweave version 1 JSON here"></textarea></label><button type="button" data-import>Apply JSON</button></details>
      <div class="st-row"><button type="button" data-png>Export spell as PNG</button></div><p class="st-hint">PNG includes every circle, note, pitch and duration. JSON preserves editable music. MIDI and audio export are outside this instrument.</p>
      <details data-recovery><summary>Local save recovery</summary><p>Download the stored library before starting fresh. Starting fresh clears this browser’s named patterns; your open spell stays here.</p><div class="st-row"><button type="button" data-backup>Download stored library</button><button type="button" data-reset>Start fresh local library</button><button type="button" data-cancel-reset hidden>Cancel reset</button></div></details>
    </section>
  </div>`;
  const $=s=>body.querySelector(s),$$=s=>[...body.querySelectorAll(s)],on=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
  const status=text=>{if(text&&mounted)$('[data-status]').textContent=text;};
  const allowed=()=>mounted && !document.hidden && document.hasFocus() && win.el.classList.contains('is-active') && !win.minimised && !!K.sound?.on;
  const playback=new Playback(()=>K.sound?.instrument(),allowed,message=>{cancelAnimationFrame(raf);raf=0;lastStep=-2;pose('idle');if(mounted){status(message);updateTransport();renderHead();}});
  const stop=message=>playback.stop(message);
  const rig=K.WIZARD_RIG?.svg;
  // Reuse the actual production rig, with private SVG IDs so its definitions
  // cannot collide with the desktop pet's copy.
  if(rig){const prefix=`st-${win.id}-`;$('.st-conductor').innerHTML=rig.replace(/\bwz-/g,prefix+'wz-').replace(/\.wz(?![-\w])/g,'.st-conductor .wz');}
  const pet=$('.st-conductor svg'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  function pose(name){
    if(!pet)return;
    pet.setAttribute('data-state',motion.matches?'idle':name);
    if(motion.matches)pet.setAttribute('data-frame',name==='party'?'happy':name);
    else pet.removeAttribute('data-frame');
  }
  function updateTransport(){
    const playing=!!playback.audio?.playing,pending=playback.pending;
    $('[data-sound]').textContent=K.sound?(K.sound.on?'Mute sound':'Enable sound'):'Sound unavailable';
    $('[data-sound]').disabled=!K.sound;
    $('[data-play]').disabled=playing||pending||!K.sound?.on;
    $('[data-stop]').disabled=!playing&&!pending;
    $('[data-listen]').disabled=!challenge||!K.sound?.on||pending;
  }
  function storageWords(text){$('[data-storage]').textContent=text;}
  function persist(){
    if(challenge){storageWords('Tune practice is temporary. Your own autosaved spell is waiting.');return false;}
    library.autosave=clone(pattern);
    if(blocked){storageWords(storageError||loaded.warning||'Another tab changed local saves. Download your current spell, then reopen Starweave to read that library.');return false;}
    try{
      const current=localStorage.getItem(KEY);
      if(current!==raw){blocked=true;storageWords('Another tab changed local saves. Download your current spell, then reopen Starweave to read that library.');return false;}
      const next=JSON.stringify(library);localStorage.setItem(KEY,next);raw=next;storageWords('Autosaved in this browser. JSON makes a portable backup.');return true;
    }catch{storageWords('Local save failed. Your spell is still open; download JSON to keep it.');return false;}
  }
  function renderSaves(){
    const el=$('[data-saved]');el.replaceChildren(new Option('Choose a pattern',''),...library.saves.map(s=>new Option(s.name,s.id)));el.value=selected;
    const chosen=library.saves.some(s=>s.id===selected);
    for(const name of ['load','replace','delete'])$(`[data-${name}]`).disabled=!chosen||!!challenge;
    $('[data-save]').disabled=!!challenge; $('[data-restore]').disabled=!library.deleted||!!challenge;
  }
  function remember(next,message){
    next=validate(next);stop();history.push(clone(pattern));if(history.length>60)history.shift();pattern=next;revision++;
    page=Math.min(page,pattern.bars-1);cursor=Math.min(cursor,pattern.bars*16-1);persist();render();status(message);
    if(challenge)$('[data-result]').textContent='Keep listening and tinkering, then check your tune.';
  }
  function attempt(fn){try{fn();}catch(err){status(err.message);}}
  function edit(start,p= pitch,remove=eraser){
    attempt(()=>{const next=remove?erase(pattern,start):place(pattern,start,rune,p,duration);cursor=start;pitch=p;
      remember(next,remove?`Moment ${start+1} cleared.`:`${RUNES[rune].name}, ${pitchName(p)}, moment ${start+1}, ${duration} ${duration===1?'moment':'moments'}.`);
      const count=new Set(pattern.notes.map(n=>n.rune)).size;pose(count===3?'party':'happy');
      $('[data-speech]').textContent=count===3?'Bells AND sparks AND moonlight? That’s a proper spell!':'Ooh. Put another one over there!';
    });
  }
  const moments=[];
  for(let i=0;i<16;i++){
    const b=document.createElement('button');b.type='button';moments.push(b);$('.st-moments').append(b);
    on(b,'click',()=>edit(page*16+i));
    on(b,'keydown',e=>{
      if(e.repeat && ['Enter',' '].includes(e.key)){e.preventDefault();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Delete','Backspace'].includes(e.key))return;
      e.preventDefault();const start=page*16+i;
      if(e.key==='Delete'||e.key==='Backspace'){edit(start,pitch,true);return;}
      if(e.key==='ArrowLeft')cursor=(start+pattern.bars*16-1)%(pattern.bars*16);
      if(e.key==='ArrowRight')cursor=(start+1)%(pattern.bars*16);
      if(e.key==='Home')cursor=page*16;if(e.key==='End')cursor=page*16+15;
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){
        const index=Math.max(0,pattern.palette.indexOf(pitch));pitch=pattern.palette[Math.max(0,Math.min(3,index+(e.key==='ArrowUp'?1:-1)))];cursor=start;
        status(`Selected ${pitchName(pitch)}. Enter to place.`);
      }
      page=Math.floor(cursor/16);render();moments[cursor%16].focus();
    });
  }
  function noteWords(n){return `${RUNES[n.rune].name}, ${pitchName(n.pitch)}, ${n.duration} ${n.duration===1?'moment':'moments'}`;}
  function circleSvg(){
    const notes=pattern.notes.filter(n=>Math.floor(n.start/16)===page);
    let svg='<circle cx="250" cy="250" r="229" class="st-outline"/>';
    pattern.palette.forEach((p,i)=>{svg+=`<circle cx="250" cy="250" r="${92+i*30}" class="st-ring"/><text x="253" y="${244-(92+i*30)}" class="st-ring-label">${pitchName(p)}</text>`;});
    const points=notes.map(n=>point(n.start%16,n.pitch,pattern.palette));
    if(points.length>1)svg+=`<path d="M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')} Z" class="st-connections"/>`;
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2-Math.PI/2,n=notes.find(n=>n.start%16===i),p=point(i,n?.pitch??pitch,pattern.palette),radius=Math.hypot(p.x-250,p.y-250)-29;
      svg+=`<text x="${250+Math.cos(a)*229}" y="${254+Math.sin(a)*229}" class="st-number">${page*16+i+1}</text><g data-socket="${page*16+i}" class="st-socket${p.outside?' st-outside':''}"><circle cx="${p.x}" cy="${p.y}" r="${n?17:6}" fill="${n?RUNES[n.rune].colour:'var(--surface)'}"/><text x="${p.x}" y="${p.y+7}" class="st-rune">${n?RUNES[n.rune].symbol:'·'}</text>${n?`<text x="${250+Math.cos(a)*radius}" y="${254+Math.sin(a)*radius}" class="st-duration">×${n.duration}${p.outside?' '+pitchName(n.pitch):''}</text>`:''}</g>`;
    }
    return svg;
  }
  function render(){
    if(!mounted)return;
    $('[data-title]').value=pattern.title;$('[data-tempo]').value=pattern.tempo;$('[data-bpm]').textContent=pattern.tempo+' BPM';$('[data-loop]').checked=pattern.loop;
    $('[data-page]').replaceChildren(...Array.from({length:pattern.bars},(_,i)=>new Option(`${i+1} of ${pattern.bars} · moments ${i*16+1}–${i*16+16}`,i)));
    $('[data-page]').value=page;$('[data-add]').disabled=pattern.bars===8||!!challenge;$('[data-remove]').disabled=pattern.bars===1||!!challenge;
    $('[data-scale]').value=Object.keys(PALETTES).find(id=>String(PALETTES[id])===String(pattern.palette))||'';
    $$('[data-ring]').forEach((s,i)=>{s.value=pattern.palette[i];});
    const pitches=[...new Set([...pattern.palette,pitch])].sort((a,b)=>a-b);
    $('[data-pitch]').replaceChildren(...pitches.map(p=>new Option(pitchName(p)+(pattern.palette.includes(p)?'':' · kept pitch'),p)));$('[data-pitch]').value=pitch;
    $('[data-rune]').value=rune;$('[data-duration]').value=duration;
    $$('[data-ingredient]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ingredient===rune&&!eraser)));
    $('[data-erase]').setAttribute('aria-pressed',String(eraser));$('[data-undo]').disabled=!history.length;
    $('[data-new]').disabled=!!challenge;$$('[data-recipe]').forEach(b=>{b.disabled=!!challenge;});
    moments.forEach((b,i)=>{
      const start=page*16+i,n=pattern.notes.find(n=>n.start===start),holds=pattern.notes.filter(n=>n.start<start&&n.start+n.duration>start);
      b.innerHTML=`<small>${start+1}</small><span>${n?RUNES[n.rune].symbol:'·'}</span><small>${n?pitchName(n.pitch):holds.length?'hold':'rest'}</small>`;
      b.style.setProperty('--rune',n?RUNES[n.rune].colour:'var(--surface)');b.classList.toggle('has-rune',!!n);b.tabIndex=start===cursor?0:-1;
      b.setAttribute('aria-label',`Moment ${start+1}: ${n?noteWords(n):'no attack'}${holds.length?'. Holding '+holds.map(noteWords).join('; '):''}. ${eraser?'Enter to erase':'Enter to place selected ingredient'}.`);
    });
    $('[data-circle]').innerHTML=circleSvg();
    const kept=pattern.notes.filter(n=>!pattern.palette.includes(n.pitch));
    $('[data-kept]').textContent=kept.length?`${kept.length} ${kept.length===1?'note keeps its':'notes keep their'} original pitch outside this palette (dashed edge sockets): ${[...new Set(kept.map(n=>pitchName(n.pitch)))].join(', ')}. Nothing has been retuned.`:'Pitch rings change only future placements. Existing notes keep their pitches.';
    renderSaves();updateTransport();renderHead();
  }
  function renderHead(){
    const audio=playback.audio,step=audio?.step??-1,reduced=motion.matches;
    moments.forEach((b,i)=>b.classList.toggle('is-sounding',step===page*16+i));
    $$('[data-socket]').forEach(g=>g.classList.toggle('is-sounding',+g.dataset.socket===step));
    const star=$('.st-orbit');star.hidden=step<0||Math.floor(step/16)!==page||reduced;
    if(!star.hidden){const a=(audio.position%16)/16*Math.PI*2-Math.PI/2;star.style.left=(50+Math.cos(a)*45.8)+'%';star.style.top=(50+Math.sin(a)*45.8)+'%';}
    if(step!==lastStep){
      lastStep=step;$('[data-position]').textContent=step<0?'Star resting.':`Playing ${challenge && playingTarget?'target · ':''}circle ${Math.floor(step/16)+1}, moment ${step+1}.`;
      if(step>=0){const source=playingTarget?challenge?.target:pattern,n=source?.notes.find(n=>n.start===step);pose(n?(n.rune==='ember'?'party':n.rune==='moon'?'idle':'happy'):'idle');}
    }
  }
  let playingTarget=false;
  function frame(){
    if(!mounted||!playback.audio?.playing)return;
    const nextPage=Math.floor(playback.audio.step/16);
    if(nextPage!==page && nextPage>=0 && nextPage<pattern.bars){page=nextPage;cursor=page*16;render();}
    renderHead();raf=requestAnimationFrame(frame);
  }
  async function play(target=false){
    const source=target?challenge?.target:pattern;if(!source?.notes.length){status('Place an ingredient or choose a recipe first.');return;}
    try{
      playingTarget=target;const pending=playback.start(clone(source));updateTransport();status('Waking the wizard’s music…');
      if(await pending){status(target?'Listen to the target, then build your answer.':'The wizard is conducting your spell.');updateTransport();frame();}
    }catch(err){status(err.message);updateTransport();}
  }
  on($('[data-sound]'),'click',()=>{stop();K.sound?.toggle();updateTransport();});
  on($('[data-play]'),'click',()=>play());on($('[data-stop]'),'click',()=>stop('The star is resting. Your spell stays here.'));
  on($('[data-tempo]'),'input',()=>{stop();$('[data-bpm]').textContent=$('[data-tempo]').value+' BPM';});
  on($('[data-tempo]'),'change',()=>attempt(()=>remember({...pattern,tempo:+$('[data-tempo]').value},'Pace changed. Cast again.')));
  on($('[data-loop]'),'change',()=>remember({...pattern,loop:$('[data-loop]').checked},'Repeat changed. Cast again.'));
  const setTitle=()=>attempt(()=>{const title=$('[data-title]').value;if(title!==pattern.title)remember({...pattern,title},'Spell title changed.');});
  on($('[data-title]'),'change',setTitle);
  on($('[data-set-title]'),'click',setTitle);
  on($('[data-title]'),'input',()=>stop());
  on($('[data-json]'),'input',()=>stop());
  on($('[data-page]'),'change',()=>{page=+$('[data-page]').value;cursor=page*16;render();});
  on($('[data-add]'),'click',()=>attempt(()=>{remember(resize(pattern,pattern.bars+1),'Added sixteen more moments.');page=pattern.bars-1;cursor=page*16;render();}));
  on($('[data-remove]'),'click',()=>attempt(()=>remember(resize(pattern,pattern.bars-1),'Removed the last empty circle.')));
  on($('[data-rune]'),'change',()=>{rune=$('[data-rune]').value;eraser=false;render();});
  on($('[data-pitch]'),'change',()=>{pitch=+$('[data-pitch]').value;render();});
  on($('[data-duration]'),'change',()=>{duration=+$('[data-duration]').value;});
  $$('[data-ingredient]').forEach(b=>on(b,'click',()=>{rune=b.dataset.ingredient;eraser=false;render();}));
  on($('[data-scale]'),'change',()=>{const pitches=PALETTES[$('[data-scale]').value];if(pitches)attempt(()=>{remember(palette(pattern,pitches),'Pitch palette changed. Existing notes keep their exact pitches.');pitch=pattern.palette[2];render();});});
  on($('[data-apply-rings]'),'click',()=>attempt(()=>{remember(palette(pattern,$$('[data-ring]').map(s=>+s.value)),'Custom rings applied. Existing notes keep their pitches.');pitch=pattern.palette[2];render();}));
  on($('[data-erase]'),'click',()=>{eraser=!eraser;render();status(eraser?'Eraser selected. Choose a moment to clear.':'Ingredient placement selected.');});
  on($('[data-undo]'),'click',()=>{if(!history.length)return;stop();pattern=history.pop();revision++;page=Math.min(page,pattern.bars-1);cursor=page*16;persist();render();status('Undid the last change.');});
  on($('[data-clear]'),'click',()=>remember({...pattern,notes:pattern.notes.filter(n=>Math.floor(n.start/16)!==page)},'Circle cleared. Undo can restore it.'));
  on($('[data-new]'),'click',()=>remember(blank(),'A fresh circle. Undo can restore your spell.'));
  $$('[data-recipe]').forEach(b=>on(b,'click',()=>{remember(recipe(b.dataset.recipe),'Recipe loaded. Make it your own; Undo returns to your spell.');$('[data-speech]').textContent='I know this one! Shall I conduct?';}));
  on($('[data-circle]'),'pointerdown',e=>{
    if(e.button!==0)return;const rect=e.currentTarget.getBoundingClientRect(),p=cell((e.clientX-rect.left)/rect.width*500,(e.clientY-rect.top)/rect.height*500,pattern.palette);
    if(p){e.preventDefault();edit(page*16+p.moment,p.pitch);}
  });
  on($('[data-begin]'),'click',()=>{
    if(challenge){status('Return to your spell before starting another tune.');return;}
    stop();challenge={target:tune($('[data-tune]').value),pattern:clone(pattern),history:clone(history),page,cursor};pattern=blank();pattern.loop=false;history=[];page=cursor=0;revision++;
    $('[data-challenge]').hidden=false;$('[data-goal]').textContent=`Rebuild ${challenge.target.title}: four notes. Match ingredient, pitch, start and duration. Extra notes also count.`;
    $('[data-result]').textContent='Your answer starts with an empty circle.';$('[data-hint-text]').hidden=true;persist();render();status('Tune practice started. Your own spell is safe.');
  });
  on($('[data-listen]'),'click',()=>play(true));
  on($('[data-hint]'),'click',()=>{if(!challenge)return;$('[data-hint-text]').hidden=false;$('[data-hint-text]').textContent=challenge.target.notes.map(n=>`Moment ${n.start+1}: ${noteWords(n)}.`).join(' ');});
  on($('[data-check]'),'click',()=>{if(!challenge)return;stop();const result=match(pattern,challenge.target);$('[data-result]').textContent=result.complete?'You matched the tune! All four notes have the right ingredient, pitch, start and duration.':`${result.correct} of ${result.total} notes match; ${result.extra} unmatched ${result.extra===1?'note':'notes'}. Listen again or use the written hint.`;pose(result.complete?'party':'happy');});
  on($('[data-leave]'),'click',()=>{if(!challenge)return;stop();({pattern,history,page,cursor}=challenge);challenge=null;revision++;$('[data-challenge]').hidden=true;persist();render();status('Your own spell is back, unchanged.');$('[data-begin]').focus();});
  on($('[data-saved]'),'change',()=>{selected=$('[data-saved]').value;const item=library.saves.find(s=>s.id===selected);if(item)$('[data-name]').value=item.name;renderSaves();});
  function named(replace=false){attempt(()=>{if(challenge)return;const result=saveNamed(library,$('[data-name]').value,pattern,replace?selected:null);library=result.library;selected=result.id;const saved=persist();renderSaves();status(!saved?'Pattern kept in this open session. Download JSON to retain it.':replace?'Selected pattern replaced.':'Named pattern saved.');});}
  on($('[data-save]'),'click',()=>named());on($('[data-replace]'),'click',()=>named(true));
  on($('[data-load]'),'click',()=>{const item=library.saves.find(s=>s.id===selected);if(item)remember(item.pattern,'Named pattern loaded. Undo returns to your previous spell.');});
  on($('[data-delete]'),'click',()=>{const item=library.saves.find(s=>s.id===selected);if(!item||challenge)return;library.deleted=item;library.saves=library.saves.filter(s=>s.id!==selected);selected='';persist();renderSaves();status('Named pattern deleted. Undo last deletion can restore it, including after reload.');$('[data-restore]').focus();});
  on($('[data-restore]'),'click',()=>attempt(()=>{if(!library.deleted||challenge)return;if(library.saves.length>=24)throw new Error('Export or delete another pattern to make space.');const item=library.deleted;if(library.saves.some(s=>s.name.toLowerCase()===item.name.toLowerCase()))throw new Error('That name is in use. Rename the current entry before restoring.');library.saves.push(item);library.deleted=null;selected=item.id;persist();renderSaves();status('Deleted pattern restored.');$('[data-saved]').focus();}));
  function download(blob,name){
    for(const u of urls)URL.revokeObjectURL(u);urls.clear();
    const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;body.append(a);a.click();a.remove();
  }
  const filename=(p=pattern)=>p.title.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,60)||'starweave';
  on($('[data-show-json]'),'click',()=>{stop();$('[data-json]').value=stringify(pattern);status('Current spell is in the JSON editor. Edits apply only when you choose Apply JSON.');});
  on($('[data-json-download]'),'click',()=>attempt(()=>{stop();download(new Blob([stringify(pattern)],{type:'application/json'}),filename()+'.json');status('Editable JSON exported.');}));
  on($('[data-import]'),'click',()=>attempt(()=>remember(parse($('[data-json]').value),'JSON applied. Undo returns to your previous spell.')));
  on($('[data-file]'),'change',async()=>{
    stop();const file=$('[data-file]').files[0],stamp=revision,generation=++fileGeneration;if(!file)return;
    try{if(file.size>MAX_TEXT)throw new Error('JSON file is too large (80 KB maximum).');const text=await file.text();if(!mounted||generation!==fileGeneration)return;if(stamp!==revision){status('File read cancelled because your spell changed. Choose the file again.');return;}parse(text);$('[data-json]').value=text;status('File validated and placed in the editor. Choose Apply JSON to load it.');}catch(err){if(generation===fileGeneration)status(err.message);}
    if(mounted)$('[data-file]').value='';
  });
  on($('[data-png]'),'click',()=>attempt(()=>{stop();const snapshot=clone(pattern);drawPNG(snapshot,blob=>{if(!mounted)return;if(blob){download(blob,filename(snapshot)+'.png');status('PNG exported with every circle, pitch and duration.');}else status('PNG could not be created. Try JSON export instead.');});}));
  on($('[data-backup]'),'click',()=>attempt(()=>{download(new Blob([raw??'null'],{type:'application/json'}),'starweave-stored-library.json');status('Stored library downloaded without changing it.');}));
  on($('[data-reset]'),'click',()=>{
    if(!resetArmed){resetArmed=true;$('[data-reset]').textContent='Confirm clear local named patterns';$('[data-cancel-reset]').hidden=false;status('Your open spell stays. Download the stored library first if you need its named patterns.');return;}
    attempt(()=>{const fresh={version:1,autosave:clone(challenge?challenge.pattern:pattern),saves:[],deleted:null},text=JSON.stringify(fresh);localStorage.setItem(KEY,text);raw=text;library=fresh;blocked=false;storageError='';resetArmed=false;selected='';$('[data-reset]').textContent='Start fresh local library';$('[data-cancel-reset]').hidden=true;renderSaves();storageWords('Local library reset. Your open spell is retained.');});
  });
  on($('[data-cancel-reset]'),'click',()=>{resetArmed=false;$('[data-reset]').textContent='Start fresh local library';$('[data-cancel-reset]').hidden=true;status('Local library reset cancelled.');$('[data-reset]').focus();});
  on(window,'blur',()=>stop('The wizard waits while you are away.'));
  on(window,'pagehide',()=>stop());
  on(document,'visibilitychange',()=>{if(document.hidden)stop('The wizard waits while you are away.');});
  on(window,'storage',e=>{if(e.key===KEY||e.key===null){stop();blocked=true;storageWords('Another tab changed local saves. Download your current spell, then reopen Starweave to read that library.');}});
  on(motion,'change',()=>{pose('idle');renderHead();});
  cleanups.push(K.on('sound',e=>{if(!e.on)stop('Sound muted. Your spell is safe.');updateTransport();}));
  cleanups.push(K.on('silence',()=>stop('Sound stopped. Cast again when you are ready.')));
  cleanups.push(K.on('minimise',e=>{if(e.id===win.id)stop('Starweave minimised. Your spell is safe.');}));
  cleanups.push(K.on('windowfocus',e=>{if(e.id!==win.id)stop('The wizard waits while another window is active.');}));
  // Stop immediately on keyboard focus leaving the app, including the taskbar.
  on(body,'focusout',e=>{if(e.relatedTarget&&!win.el.contains(e.relatedTarget))stop('The wizard waits while you are away.');});
  render();
  if(!library.autosave&&!blocked)persist();
  else storageWords(storageError||loaded.warning||(library.autosave?'Restored your autosaved spell.':'Your edits autosave in this browser. JSON makes a portable backup.'));
  win.setStatus('Starweave · musical spellcraft · sound starts deliberately');
  return {win,dispose(){mounted=false;stop();abort.abort();cleanups.forEach(fn=>fn?.());for(const url of urls)URL.revokeObjectURL(url);urls.clear();}};
}

// Canvas export is drawn from the same explicit model, including kept pitches
// and holds crossing circle boundaries. No external images can taint the PNG.
export function drawPNG(value,done) {
  const p=validate(value),columns=Math.min(2,p.bars),rows=Math.ceil(p.bars/columns),canvas=document.createElement('canvas');
  canvas.width=columns*560;canvas.height=rows*720+100;const c=canvas.getContext('2d');
  if(!c)throw new Error('PNG export is unavailable. Use JSON to keep your spell.');
  c.fillStyle='#fffdf8';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#161a2e';c.font='bold 24px sans-serif';c.fillText(p.title,24,34,canvas.width-48);
  c.font='14px sans-serif';c.fillText(`Starweave · ${p.tempo} BPM · ${p.loop?'repeat':'play once'} · × = moments held`,24,62,canvas.width-48);
  for(let bar=0;bar<p.bars;bar++){
    c.save();c.translate((bar%columns)*560+30,Math.floor(bar/columns)*720+100);
    c.fillStyle='#161a2e';c.font='bold 16px sans-serif';c.fillText(`Circle ${bar+1} · moments ${bar*16+1}–${bar*16+16}`,0,0);
    c.translate(0,20);c.lineWidth=1;c.strokeStyle='#a5a4b3';
    p.palette.forEach((pitch,i)=>{c.beginPath();c.arc(250,250,92+i*30,0,2*Math.PI);c.stroke();c.fillStyle='#333348';c.font='12px sans-serif';c.fillText(pitchName(pitch),254,245-(92+i*30));});
    const notes=p.notes.filter(n=>Math.floor(n.start/16)===bar);
    c.strokeStyle='#7863b8';c.setLineDash([4,5]);c.beginPath();notes.forEach((n,i)=>{const q=point(n.start%16,n.pitch,p.palette);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});if(notes.length>1)c.closePath();c.stroke();c.setLineDash([]);
    for(let i=0;i<16;i++){
      const a=i/16*2*Math.PI-Math.PI/2,n=notes.find(n=>n.start%16===i),q=point(i,n?.pitch??p.palette[2],p.palette);
      c.fillStyle='#161a2e';c.font='12px sans-serif';c.textAlign='center';c.fillText(bar*16+i+1,250+Math.cos(a)*234,254+Math.sin(a)*234);
      c.beginPath();c.arc(q.x,q.y,n?17:4,0,2*Math.PI);c.fillStyle=n?RUNES[n.rune].colour:'#fffdf8';c.fill();c.strokeStyle='#161a2e';c.setLineDash(q.outside?[2,2]:[]);c.stroke();c.setLineDash([]);
      if(n){c.fillStyle='#161a2e';c.font='24px sans-serif';c.fillText(RUNES[n.rune].symbol,q.x,q.y+7);c.font='11px sans-serif';const radius=Math.hypot(q.x-250,q.y-250)-29;c.fillText(`×${n.duration}`,250+Math.cos(a)*radius,254+Math.sin(a)*radius);}
    }
    c.textAlign='left';c.font='12px sans-serif';c.fillStyle='#161a2e';
    const holds=p.notes.filter(n=>n.start<bar*16 && n.start+n.duration>bar*16);
    c.fillText(holds.length?'Continues from previous circle: '+holds.map(n=>pitchName(n.pitch)+' from moment '+(n.start+1)).join(', '):'✧ Star chime    △ Ember pluck    ☾ Moon hum',0,515,500);
    notes.forEach((n,i)=>c.fillText(`Moment ${n.start+1}: ${RUNES[n.rune].symbol} ${pitchName(n.pitch)} ×${n.duration}`,i%2*250,542+Math.floor(i/2)*18,242));
    c.restore();
  }
  canvas.toBlob(done,'image/png');
}
