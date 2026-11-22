/* Motion kit (styles in motion-kit.css; how to use: README.md). No dependencies, about 6 KB.
   Load it at the end of <body>, or call MotionKit.init() after content is added later (React, Vue: call it in an
   effect after the elements exist; it skips elements it has already set up).

   It writes a few CSS variables and classes; motion-kit.css does the moving:
     .mk-in                 on reveal / stagger / words / nudge targets the first time they reach the screen
     --mk-p (-1..1)         on parallax targets: where they sit relative to the middle of the screen
     --mk-hs (0..1)         on lift targets: how far the element has scrolled away
     --mk-mx / --mk-my      on tilt targets: mouse position over them
     --mk-sp (0..1)         on <html>: reading progress (with data-mk-progress on <body>)
     .mk-down               on <html> while scrolling down (for hide-on-down)
     --mk-d                 on grid tiles: their delay in the row-by-row cascade
   With prefers-reduced-motion or html.mk-still nothing moves, and text is never split. */
(function(){
  var root=document.documentElement;
  function still(){ return matchMedia('(prefers-reduced-motion: reduce)').matches||root.classList.contains('mk-still') }
  function all(sel,scope){ return [].slice.call((scope||document).querySelectorAll(sel)) }
  function has(el,name){ return (' '+(el.getAttribute('data-mk')||'')+' ').indexOf(' '+name+' ')>=0 }

  /* split text into words or letters; screen readers keep the whole text through aria-label */
  function split(el,mode){
    if(el.dataset.mkSplit) return 0;
    var text=el.textContent.trim(), n=0; el.dataset.mkSplit='1';
    el.setAttribute('aria-label',text); el.textContent='';
    text.split(/\s+/).forEach(function(word,wi){
      if(wi) el.appendChild(document.createTextNode(' '));
      var w=document.createElement('span'); w.className='mk-w'; w.setAttribute('aria-hidden','true');
      if(mode==='letters') word.split('').forEach(function(ch){ var l=document.createElement('span'); l.className='mk-piece'; l.style.setProperty('--mk-i',n++); l.textContent=ch; w.appendChild(l) });
      else { w.classList.add('mk-piece'); w.style.setProperty('--mk-i',wi); w.textContent=word; n++ }
      el.appendChild(w);
    });
    return n;
  }

  var seenIO=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('mk-in'); seenIO.unobserve(e.target) } });
  },{rootMargin:'0px 0px -12% 0px'}):null;
  var live=new Set();
  var nearIO=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting) live.add(e.target); else live.delete(e.target) });
  },{rootMargin:'25% 0px'}):null;
  var lifts=[];
  /* grid tiles: those arriving together cascade left to right, row by row, 70 ms apart */
  var gridIO=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
    var arriving=es.filter(function(e){ return e.isIntersecting }).map(function(e){ return e.target });
    arriving.sort(function(a,b){ var ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect(); return (ra.top-rb.top)||(ra.left-rb.left) })
      .forEach(function(t,i){ t.style.setProperty('--mk-d',Math.min(i,8)*70+'ms'); t.classList.add('mk-in'); gridIO.unobserve(t) });
  },{rootMargin:'0px 0px -8% 0px'}):null;
  function gridTile(t,s){
    if(t.dataset.mkTile) return; t.dataset.mkTile='1';
    if(gridIO&&!s) gridIO.observe(t); else t.classList.add('mk-in');
    /* once arrived, hover and filter moves should not wait for the cascade */
    t.addEventListener('transitionend',function(e){ if(e.propertyName==='opacity') t.style.setProperty('--mk-d','0ms') });
    if(matchMedia('(hover: hover) and (pointer: fine)').matches){
      t.addEventListener('pointermove',function(e){ if(still()) return; var r=t.getBoundingClientRect(); t.style.setProperty('--mk-mx',((e.clientX-r.left)/r.width*2-1).toFixed(3)); t.style.setProperty('--mk-my',((e.clientY-r.top)/r.height*2-1).toFixed(3)) });
      t.addEventListener('pointerleave',function(){ t.style.setProperty('--mk-mx',0); t.style.setProperty('--mk-my',0) });
    }
  }

  function init(scope){
    var s=still();
    all('[data-mk]',scope).forEach(function(el){
      if(el.dataset.mkReady) return; el.dataset.mkReady='1';
      if(el.dataset.mkDelay) el.style.setProperty('--mk-delay',el.dataset.mkDelay+'ms');
      if(el.dataset.mkSpeed) el.style.setProperty('--mk-speed',el.dataset.mkSpeed);
      if(el.dataset.mkTimes) el.style.setProperty('--mk-times',el.dataset.mkTimes);
      if(has(el,'stagger')||has(el,'menu')) [].slice.call(el.children).forEach(function(c,i){ c.style.setProperty('--mk-i',i) });
      if(has(el,'words')&&!s) split(el,'words');
      if(has(el,'letters')&&!s){
        var key='mk-once:'+(el.id||el.textContent.trim().slice(0,40)), done=false;
        if(el.hasAttribute('data-mk-once')){ try{ done=sessionStorage.getItem(key)==='1'; sessionStorage.setItem(key,'1') }catch(e){} }
        if(!done){ split(el,'letters'); el.classList.add('mk-play'); setTimeout(function(){ el.classList.remove('mk-play') },4000) }
      }
      if((has(el,'reveal')||has(el,'stagger')||has(el,'words')||has(el,'nudge'))){ if(seenIO&&!s) seenIO.observe(el); else el.classList.add('mk-in') }
      if(has(el,'parallax')&&nearIO) nearIO.observe(el);
      if(has(el,'lift')) lifts.push(el);
      if(has(el,'skeleton')){
        var imgs=all('img',el), left=imgs.length;
        if(left){ el.classList.add('mk-loading');
          imgs.forEach(function(img){
            function ok(){ img.classList.add('mk-ok'); if(--left<=0) el.classList.remove('mk-loading') }
            if(img.complete&&img.naturalWidth) ok(); else { img.addEventListener('load',ok,{once:true}); img.addEventListener('error',ok,{once:true}) }
          });
        }
      }
      if(has(el,'tilt')&&matchMedia('(hover: hover) and (pointer: fine)').matches){
        var area=el.closest('[data-mk-tilt-area]')||el;
        area.addEventListener('pointermove',function(e){ if(still()) return; var r=area.getBoundingClientRect(); el.style.setProperty('--mk-mx',((e.clientX-r.left)/r.width*2-1).toFixed(3)); el.style.setProperty('--mk-my',((e.clientY-r.top)/r.height*2-1).toFixed(3)) });
        area.addEventListener('pointerleave',function(){ el.style.setProperty('--mk-mx',0); el.style.setProperty('--mk-my',0) });
      }
    });
    all('[data-mk~=grid]',scope).forEach(function(g){ [].slice.call(g.children).forEach(function(t){ gridTile(t,s) }) });
    if(document.body&&document.body.hasAttribute('data-mk-progress')&&!document.querySelector('.mk-progress')){
      var bar=document.createElement('div'); bar.className='mk-progress'; bar.setAttribute('aria-hidden','true'); document.body.appendChild(bar);
    }
    ask();
  }

  /* one frame per scroll: progress, lift, parallax, scroll direction */
  var queued=false, lastY=scrollY;
  function frame(){
    queued=false;
    var vh=innerHeight, y=scrollY, max=root.scrollHeight-vh;
    root.style.setProperty('--mk-sp',max>0?(y/max).toFixed(4):0);
    var dy=y-lastY; if(Math.abs(dy)>6){ root.classList.toggle('mk-down',dy>0&&y>vh*.6); lastY=y }
    if(still()) return;
    lifts.forEach(function(el){ var h=el.offsetHeight||vh, top=el.getBoundingClientRect().top+y; el.style.setProperty('--mk-hs',Math.min(1,Math.max(0,(y-top)/h)).toFixed(4)) });
    live.forEach(function(el){ var r=el.getBoundingClientRect(); el.style.setProperty('--mk-p',Math.max(-1.2,Math.min(1.2,((r.top+r.height/2)-vh/2)/vh)).toFixed(4)) });
  }
  function ask(){ if(!queued){ queued=true; requestAnimationFrame(frame) } }
  addEventListener('scroll',ask,{passive:true});
  addEventListener('resize',ask);
  /* a focused hide-on-down bar always comes back */
  document.addEventListener('focusin',function(e){ if(e.target.closest&&e.target.closest('[data-mk~=hide-on-down]')) root.classList.remove('mk-down') });

  /* fade el out, run change(), fade it back: for filters and tabs, so content never hard-cuts */
  function swap(el,change){
    if(still()){ change(); return }
    el.classList.add('mk-swap','mk-out');
    setTimeout(function(){ change(); requestAnimationFrame(function(){ el.classList.remove('mk-out') }) },180);
  }

  /* filter or sort a grid: run change(), then every tile glides from where it was to where it is now (FLIP);
     tiles that were hidden before grow in */
  function flip(grid,change){
    var tiles=[].slice.call(grid.children);
    if(still()||!Element.prototype.animate){ change(); return }
    var first=new Map(); tiles.forEach(function(t){ if(!t.hidden) first.set(t,t.getBoundingClientRect()) });
    change();
    var fresh=0;
    tiles.forEach(function(t){
      if(t.hidden) return;
      var last=t.getBoundingClientRect(), f=first.get(t);
      if(f){ var dx=f.left-last.left, dy=f.top-last.top; if(dx||dy) t.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'}) }
      else { t.classList.add('mk-in'); t.style.setProperty('--mk-d','0ms'); t.animate([{opacity:0,transform:'scale(.88)'},{opacity:1,transform:'none'}],{duration:420,delay:120+Math.min(fresh++,8)*50,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}) }
    });
  }

  window.MotionKit={init:init,swap:swap,flip:flip,split:split,still:still};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ init() }); else init();
})();
