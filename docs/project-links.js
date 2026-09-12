(function(){
  if (window.__siteEnhancerLoaded) return;
  window.__siteEnhancerLoaded = true;

  const OWNER = (document.body && document.body.dataset && document.body.dataset.githubOwner) || 'JulioLanda4';
  const PAGE_LANG = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'es';
  function hasSiteButton(container, repoName){
    if (container.querySelector('.site-link')) return true;
    const anchors = container.querySelectorAll('a');
    const ghPagesPattern = repoName ? new RegExp(`^https?://[^/]+\\.github\\.io/${repoName}/?`, 'i') : null;
    for (const a of anchors){
      const t = (a.textContent || '').trim().toLowerCase();
      const href = (a.getAttribute('href') || '').trim();
      if (t === 'sitio' || t === 'demo' || t === 'website') return true;
      if (ghPagesPattern && ghPagesPattern.test(href)) return true;
    }
    return false;
  }
  function addSiteButton(container, url){
    const a = document.createElement('a');
    a.className = 'btn btn-sm btn-success site-link';
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = PAGE_LANG === 'en' ? 'Site' : 'Sitio';
    container.prepend(a);
  }
  async function enhance(el){
    const h3 = el.querySelector('h3');
    const links = el.querySelector('.links');
    if (!h3 || !links || el.classList.contains('private')) return;
    if (hasSiteButton(links)) return;
    const repoName = (h3.textContent || '').trim();
    if (!repoName) return;
    if (hasSiteButton(links, repoName)) return;
    const repo = OWNER + '/' + repoName;
    try {
      const res = await fetch('https://api.github.com/repos/' + repo, { headers: { 'Accept': 'application/vnd.github+json' }});
      if (!res.ok) return;
      const data = await res.json();
      let site = (data.homepage || '').trim();
      if (!site && data.has_pages) { site = `https://${OWNER}.github.io/${repoName}/`; }
      if (site) addSiteButton(links, site);
    } catch(e) { /* noop */ }
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.project-card').forEach(enhance);

    // Persistent language (ES <-> EN) using path prefix /en/ and localStorage
    const getCurrentLang = () => location.pathname.split('/').includes('en') ? 'en' : 'es';
    const setPrefLang = (lang) => { try { localStorage.setItem('siteLang', lang); } catch(_){} };
    const getPrefLang = () => {
      try { return localStorage.getItem('siteLang') || getCurrentLang(); } catch(_) { return getCurrentLang(); }
    };
    const pathWithLang = (lang, path) => {
      const segs = (path || location.pathname).split('/');
      // ensure filename
      let last = segs[segs.length-1];
      if (!last || last === '') segs[segs.length-1] = 'index.html';
      const hasEN = segs.includes('en');
      if (lang === 'en' && !hasEN) segs.splice(segs.length-1, 0, 'en');
      if (lang === 'es' && hasEN) segs.splice(segs.indexOf('en'), 1);
      return segs.join('/');
    };
    const applyLangToLinks = (lang) => {
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;
        const u = new URL(href, location.href);
        // only same-origin internal html pages
        if (u.origin !== location.origin) return;
        if (!/\.html?$/.test(u.pathname)) return;
        u.pathname = pathWithLang(lang, u.pathname);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      });
    };
    // Build a language switch in the navbar
    const navLinks = Array.from(document.querySelectorAll('.navbar a, .quarto-navbar-tools a'));
    const placeholder = navLinks.find(a => a.getAttribute('aria-label')==='Language Switch' || ((a.textContent||'').trim().toLowerCase()==='idioma'));
    let switchEl = null;
    const mountSwitch = (current) => {
      if (!placeholder || switchEl) return;
      const wrap = document.createElement('span');
      wrap.className = 'lang-switch';
      const toggle = document.createElement('span');
      toggle.className = 'lang-toggle';
      toggle.innerHTML = '<span class="es">ES</span><span class="en">EN</span><span class="thumb"></span>';
      if (current==='en') toggle.classList.add('checked');
      wrap.appendChild(toggle);
      placeholder.replaceWith(wrap);
      switchEl = toggle;
      toggle.setAttribute('role','switch');
      toggle.setAttribute('aria-label','Language');
      toggle.setAttribute('aria-checked', current==='en' ? 'true' : 'false');
      toggle.addEventListener('click', () => {
        const next = (getPrefLang()==='en') ? 'es' : 'en';
        setPrefLang(next);
        const dest = pathWithLang(next, location.pathname);
        location.href = dest + location.search + location.hash;
      });
      toggle.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle.click(); }
      });
    };
    const reflectSwitch = (lang) => {
      if (!switchEl) return;
      if (lang==='en') switchEl.classList.add('checked'); else switchEl.classList.remove('checked');
      switchEl.setAttribute('aria-checked', lang==='en' ? 'true' : 'false');
    };
    // Enforce preferred language on initial load
    const pref = getPrefLang();
    if (pref !== getCurrentLang()) {
      const dest = pathWithLang(pref, location.pathname);
      // Redirect once to preferred language
      location.replace(dest + location.search + location.hash);
    } else {
      // Rewrite internal links to keep language across navigation
      applyLangToLinks(pref);
      mountSwitch(pref);
      reflectSwitch(pref);
      // Update navbar labels to current language
      const setNavbarLabels = (lang) => {
        const labelsES = { 'index.html':'Inicio', 'cv.html':'CV', 'publicaciones.html':'Publicaciones', 'proyectos.html':'Proyectos', 'about.html':'Acerca de mí' };
        const labelsEN = { 'index.html':'Home',  'cv.html':'CV', 'publicaciones.html':'Publications', 'proyectos.html':'Projects', 'about.html':'About' };
        const map = lang==='en' ? labelsEN : labelsES;
        const navAnchors = document.querySelectorAll('.navbar .navbar-nav a.nav-link');
        navAnchors.forEach(a => {
          const u = new URL(a.getAttribute('href'), location.href);
          // basename, ignoring any /en/ segment
          const parts = u.pathname.split('/').filter(Boolean);
          const file = parts[parts.length-1] || 'index.html';
          if (map[file]) {
            const target = a.querySelector('.menu-text');
            if (target) target.textContent = map[file];
            else a.textContent = map[file];
          }
        });
      };
      const setFooterLabels = (lang) => {
        const el = document.querySelector('.nav-footer-center, .footer .nav-footer-center, .footer .nav-footer .nav-footer-center');
        if (!el) return;
        const year = new Date().getFullYear();
        const htmlES = `© Julio Landa · ${year} · Código: <a href='https://opensource.org/license/mit/'>MIT</a> · Contenido: <a href='https://creativecommons.org/licenses/by-nc/4.0/'>CC BY‑NC 4.0</a>`;
        const htmlEN = `© Julio Landa · ${year} · Code: <a href='https://opensource.org/license/mit/'>MIT</a> · Content: <a href='https://creativecommons.org/licenses/by-nc/4.0/'>CC BY‑NC 4.0</a>`;
        el.innerHTML = (lang==='en') ? htmlEN : htmlES;
      };
      setNavbarLabels(pref);
      setFooterLabels(pref);
    }
    // If switch placeholder exists and we redirected earlier, still mount it
    if (placeholder && !switchEl) { mountSwitch(getPrefLang()); reflectSwitch(getPrefLang()); }

    // Mini zoom popover for project images (positioned over the image)
    const imgs = Array.from(document.querySelectorAll('.project-media'));
    if (imgs.length) {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay mini';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'lb-close';
      closeBtn.setAttribute('aria-label', 'Cerrar');
      closeBtn.textContent = '×';
      const big = document.createElement('img');
      big.style.position = 'fixed';
      overlay.appendChild(closeBtn);
      overlay.appendChild(big);
      document.body.appendChild(overlay);

      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const showAt = (img) => {
        const r = img.getBoundingClientRect();
        const maxW = Math.min(520, Math.max(r.width * 1.5, 300));
        const maxH = 520;
        big.src = img.getAttribute('src');
        // Center popover over the thumbnail
        const left = clamp(r.left + r.width/2 - maxW/2, 12, innerWidth - maxW - 12);
        const top = clamp(r.top + r.height/2 - maxH/2, 12, innerHeight - maxH - 12);
        big.style.left = left + 'px';
        big.style.top = top + 'px';
        big.style.maxWidth = maxW + 'px';
        big.style.maxHeight = maxH + 'px';
        overlay.classList.add('show');
      };
      const hide = () => {
        overlay.classList.remove('show');
        setTimeout(() => { big.removeAttribute('src'); }, 150);
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('lb-close')) hide();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
      imgs.forEach(img => img.addEventListener('click', () => showAt(img)));
    }
  });
})();

