/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - BEFORE THE FIRST PAINT
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. It's tiny on purpose: it runs before
   anything is drawn (a plain script in <head>, which every browser waits
   for, unlike the deferred ones), so the visitor's saved wallpaper is
   there from the very first frame instead of flashing in late.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  try {
    var wall = JSON.parse(localStorage.getItem('kasai:wallpaper') || 'null');
    if (wall && wall.v === 1) {
      // Only known values ever reach the page.
      if (/^(lavender|blue|yellow|teal|pink|navy|blush)$/.test(wall.colour)) html.setAttribute('data-wall', wall.colour);
      if (/^(dots|grid|plain)$/.test(wall.pattern)) html.setAttribute('data-pattern', wall.pattern);
    }
  } catch (e) { /* storage blocked: the default wallpaper */ }
})();
