// Early language redirect to avoid flicker
(function(){
  if (window.__langPrefLoaded) return;
  window.__langPrefLoaded = true;

  try {
    var pref = null;
    try { pref = localStorage.getItem('siteLang'); } catch(_) {}
    var segs = location.pathname.split('/');
    var hasEN = segs.includes('en');
    var current = hasEN ? 'en' : 'es';
    if (!pref) return; // no preference, keep current
    if (pref === current) return;
    // ensure filename
    if (!segs[segs.length-1] || segs[segs.length-1] === '') segs[segs.length-1] = 'index.html';
    if (pref === 'en' && !hasEN) segs.splice(segs.length-1, 0, 'en');
    if (pref === 'es' && hasEN) segs.splice(segs.indexOf('en'), 1);
    var dest = segs.join('/');
    if (dest !== location.pathname) {
      location.replace(dest + location.search + location.hash);
    }
  } catch (_) {}
})();
