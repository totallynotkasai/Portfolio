// Small DOM/event doubles for driving the actual production view handlers.
// Browser layout, native input and real audio are reviewed separately.
import {mount,unmount} from '../../starweave-view.js';
import {KEY} from '../../starweave-model.js';
class Target {
  constructor(){this.events=new Map();}
  addEventListener(type,fn,options={}){const list=this.events.get(type)||[];list.push({fn,signal:options.signal});this.events.set(type,list);}
  removeEventListener(type,fn){this.events.set(type,(this.events.get(type)||[]).filter(x=>x.fn!==fn));}
  fire(type,properties={}){const event={type,target:this,currentTarget:this,preventDefault(){this.prevented=true;},...properties};for(const x of [...(this.events.get(type)||[])])if(!x.signal?.aborted)x.fn(event);return event;}
  count(){return [...this.events.values()].flat().filter(x=>!x.signal?.aborted).length;}
}
class Element extends Target {
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.files=[];this.style={setProperty(){}};this.classes=new Set();this.classList={contains:c=>this.classes.has(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='class')this.classes=new Set(value.split(' '));if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);if(key==='value')this.value=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  removeAttribute(key){delete this.attributes[key];}
  set innerHTML(text){this.html=text;this.children=[];for(const m of text.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)){const e=new Element(m[1]);for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){e.setAttribute(a[1],a[2]||'');if(a[1]==='hidden')e.hidden=true;}this.append(e);}}
  get innerHTML(){return this.html||'';}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
  matches(selector){if(selector[0]==='.')return this.classes.has(selector.slice(1));if(selector[0]==='['){const [,name,value]=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)||[];return name&&Object.hasOwn(this.attributes,name)&&(value===undefined||this.attributes[name]===value);}return this.tagName.toLowerCase()===selector;}
  querySelectorAll(selector){if(selector.includes(' ')){const [first,...rest]=selector.split(' ');return this.querySelectorAll(first).flatMap(e=>e.querySelectorAll(rest.join(' ')));}return this.children.flatMap(e=>[...(e.matches(selector)?[e]:[]),...e.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  contains(element){return this===element||this.children.some(e=>e.contains(element));}
  focus(){document.activeElement=this;}
  click(){if(!this.disabled)this.fire('click');}
  getBoundingClientRect(){return {left:0,top:0,width:500,height:500};}
}
export function view({stored=null,blocked=false,on=true,pending=false,reduced=false}={}) {
  const originals=new Map(),globals=['window','document','localStorage','matchMedia','Option','requestAnimationFrame','cancelAnimationFrame','setInterval','clearInterval'];
  for(const k of globals)originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));
  const system=new Target(),documentTarget=new Target(),motion=new Target(),hub=new Map(),saved=new Map(stored===null?[]:[[KEY,stored]]),intervals=new Map(),frames=new Map(),sources=[],drawing=[],downloads=[];
  let serial=0,resume;
  const context=new Target();Object.assign(context,{state:'running',currentTime:0,destination:{},resume:()=>pending?new Promise(r=>resume=r):Promise.resolve(),createOscillator(){const o={frequency:{},connect(){},disconnect(){o.disconnected=true;},start(){},stop(){}};sources.push(o);return o;},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}});
  motion.matches=reduced;
  const K={WIZARD_RIG:{svg:'<svg class="wz"><g id="wz-figure" class="wz-figure"></g></svg>'},esc:s=>String(s),on(name,fn){const list=hub.get(name)||[];list.push(fn);hub.set(name,list);return()=>hub.set(name,(hub.get(name)||[]).filter(x=>x!==fn));},emit(name,data){for(const fn of [...(hub.get(name)||[])])fn(data);},sound:{on,instrument:()=>({context,output:{}}),toggle(){this.on=!this.on;K.emit('sound',{on:this.on});}}};system.Kasai=K;
  const doc=Object.assign(documentTarget,{hidden:false,focused:true,hasFocus(){return this.focused;},activeElement:null,createElement(tag){const e=new Element(tag);if(tag==='canvas'){e.getContext=()=>new Proxy({},{get:(_,key)=>key==='fillText'?(...args)=>drawing.push(args):()=>{},set:()=>true});e.toBlob=fn=>fn(new Blob(['PNG'],{type:'image/png'}));}if(tag==='a')e.click=()=>downloads.push({name:e.download,url:e.href});return e;}});
  const storage={getItem(key){if(blocked)throw Error('blocked');return saved.get(key)??null;},setItem(key,text){if(blocked)throw Error('quota');saved.set(key,text);}};
  const replacements={window:system,document:doc,localStorage:storage,matchMedia:()=>motion,Option:class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=String(value);}},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),setInterval:fn=>{intervals.set(++serial,fn);return serial;},clearInterval:id=>intervals.delete(id)};
  for(const [k,value]of Object.entries(replacements))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
  const body=new Element(),el=new Element();el.classes.add('is-active');el.append(body);const win={id:'starweave',headingId:'heading',body,el,setStatus(){},minimised:false};
  const $=name=>body.querySelector(`[data-${name}]`),click=name=>$(name).click(),change=(name,value,type='change')=>{const e=$(name);e.value=String(value);e.fire(type);};
  mount(win);
  return {K,win,body,$,click,change,system,doc,motion,context,sources,saved,intervals,frames,drawing,downloads,
    get pattern(){return JSON.parse(saved.get(KEY)).autosave;},get message(){return $('status').textContent;},resume(){resume?.();},setBlocked(value){blocked=value;},
    reload(){unmount(win);mount(win);},close(){unmount(win);body.replaceChildren();},reopen(){mount(win);},
    listeners(){return system.count()+doc.count()+motion.count()+[...hub.values()].flat().length;},
    cleanup(){unmount(win);for(const [k,d]of originals){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}},
  };
}
