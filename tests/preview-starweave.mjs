// npm run build, then node tests/preview-starweave.mjs. Disposable dist/qa only.
// The next production build removes these files. No production debug API.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const qa=new URL('../dist/qa/',import.meta.url);
await mkdir(qa,{recursive:true});
let page=await readFile(new URL('../dist/about.html',import.meta.url),'utf8');
page=page.replace(/<script src="\/head\.js[^"]*">/,match=>'<script src="/qa/starweave-environment.js"></script>'+match);
await writeFile(new URL('starweave.html',qa),page);
await writeFile(new URL('starweave-environment.js',qa),`// REVIEW FIXTURE: isolated storage, optional JS/CSS reduced motion and theme.
const params=new URLSearchParams(location.search),reduce=params.get('motion')==='reduce';
const storage=window.localStorage;
Object.defineProperty(window,'localStorage',{value:{getItem:key=>storage.getItem('qa:phase7:'+key),setItem:(key,value)=>storage.setItem('qa:phase7:'+key,value),removeItem:key=>storage.removeItem('qa:phase7:'+key)}});
if(reduce){const native=window.matchMedia.bind(window);window.matchMedia=query=>query.includes('prefers-reduced-motion')?Object.assign(new EventTarget(),{matches:!query.includes('no-preference'),media:query,addListener(){},removeListener(){}}):native(query);}
document.addEventListener('DOMContentLoaded',()=>{
  const theme=params.get('theme');if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;
  const style=document.createElement('style');style.textContent=(reduce?'*{animation:none!important;transition:none!important;scroll-behavior:auto!important}':'')+(params.get('zoom')==='2'?'#win-starweave .st-app{zoom:2}':'');document.head.append(style);
  const banner=document.createElement('div');banner.textContent='REVIEW FIXTURE · isolated saves'+(reduce?' · JS/CSS reduced motion':'')+(params.get('zoom')==='2'?' · CSS zoom 200%':'');banner.style.cssText='position:fixed;bottom:58px;right:6px;z-index:99999;background:#feda74;color:#161a2e;padding:2px 6px;font:10px sans-serif;pointer-events:none';document.body.append(banner);
  window.Kasai.openGame('starweave');
});
`);
console.log('Review only: /qa/starweave?theme=light&motion=reduce (also theme=dark and zoom=2). Run the production build after review to remove dist/qa.');
