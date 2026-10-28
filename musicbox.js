// Loaded on demand by the existing app launcher. No review/debug hooks.
(function () {
  let module, current;
  const load = () => module || (module = import('/starweave-view.js').then(app => { current=app; return app; }).catch(err => { module=null; throw err; }));
  window.Kasai.starweave = {
    mount(win) {
      const body=win.body;
      body.innerHTML='<p class="st-loading" role="status">Opening the spell circle…</p>';
      const marker=body.firstElementChild;
      const start=()=>load().then(app=>{if(marker.isConnected)app.mount(win);}).catch(err=>{
        console.error(err);
        if(!marker.isConnected)return;
        marker.textContent='Starweave could not load. Check your connection. ';
        const b=document.createElement('button');b.type='button';b.className='os-button';b.textContent='Try again';b.onclick=start;marker.append(b);
      });
      start();
    },
    unmount(win) { current?.unmount(win); win.body.replaceChildren(); },
  };
})();
