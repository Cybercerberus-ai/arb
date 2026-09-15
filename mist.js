(() => {
  'use strict';
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width:760px)');
  const active = new Map();
  const controls = 'a[href],button,label,input,select,textarea,summary,[tabindex]';
  const selectors = [
    '.brand','.menu-toggle','.primary-nav>a','.flight-nav>a','.flight-caption',
    '.hero-word','.hero-content>.eyebrow','.hero-description','.hero-actions>a',
    '.hero-foot>a','.hero-foot>span','.visual-label','.values-inner>span',
    'main h2','main h3','main h4','main p','main a','main button','main label','main summary',
    '.card-top','.material-number','.material-plus','.step','.sector-number',
    '.company-mini>span','.contact-item>.tiny','.form-heading>.tiny','.textarea-note>span',
    '.location-art','.laminate-scene','.footer-brand','.footer-main>p','.back-top',
    '.footer-bottom>p','.footer-bottom>div>*','dialog>p','dialog>h2','dialog>h3',
    'dialog>button','.company-details>div'
  ];
  const candidates = new Set(document.querySelectorAll(selectors.join(',')));
  // Each text/control belongs to exactly one fog layer; no nested blur stacks.
  const nodes = [...candidates].filter(element => {
    for (let parent=element.parentElement;parent;parent=parent.parentElement) if(candidates.has(parent)) return false;
    return !element.closest('noscript,.hero-content,.site-header,#privacy-sheet');
  });
  const surfaces = [...document.querySelectorAll('.about-copy,.capability-card,.applications,.project-form')];
  let enabled = !reduce.matches;
  const visible = element => {
    if (!element.getClientRects().length) return false;
    const rect=element.getBoundingClientRect();
    return rect.bottom>0 && rect.top<innerHeight;
  };
  const focused = element => element===document.activeElement || element.contains(document.activeElement);

  function clear(element) {
    active.get(element)?.cancel();
    active.delete(element);
    element.classList.remove('is-mist-moving');
    element.classList.add('is-mist-clear');
  }

  function appear(element, delay=0) {
    if (!enabled || document.hidden || focused(element)) { clear(element); return; }
    active.get(element)?.cancel();
    element.classList.add('is-mist-clear');
    // Linked cards are both a text/control node and a surface: animate them too.
    if (!element.classList.contains('mist-node')) return;
    const volume=element.classList.contains('mist-volume');
    // Keep hit targets still when focus/pointerdown clears a running reveal.
    const control=element.classList.contains('mist-control');
    const blur=small.matches?8:12;
    const keyframes=volume ? [{opacity:0},{opacity:1}] : [
      {opacity:0,filter:`blur(${blur}px) brightness(1.6)`,translate:control?'0 0px':'0 16px',scale:control?'1':'.985',offset:0},
      {opacity:.38,filter:'blur(4px) brightness(1.25)',translate:control?'0 0px':'0 8px',scale:control?'1':'.993',offset:.4},
      {opacity:1,filter:'blur(0px) brightness(1)',translate:'0 0px',scale:'1',offset:1}
    ];
    try {
      element.classList.add('is-mist-moving');
      const animation=element.animate(keyframes,{duration:volume?1250:1000,delay,easing:'cubic-bezier(.22,.65,.2,1)',fill:'backwards'});
      active.set(element,animation);
      const done=()=>{
        if(active.get(element)!==animation)return;
        active.delete(element);element.classList.remove('is-mist-moving');
      };
      animation.finished.then(done,done);
    } catch { clear(element); }
  }

  function revealFocus(event) {
    for(let element=event.target;element && element!==body;element=element.parentElement) {
      if(element.classList?.contains('mist-node') || element.classList?.contains('mist-surface'))clear(element);
    }
  }

  function replay(scope) {
    if(!scope || !enabled)return;
    // Replace the earlier FAQ/tab entry effect instead of adding a second one.
    scope.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    nodes.filter(element=>scope===element || scope.contains(element)).forEach((element,index)=>{
      if(visible(element))appear(element,Math.min(index*35,175));
    });
  }

  try {
    nodes.forEach(element=>{
      element.classList.add('mist-node');
      if(element.matches(controls) || element.querySelector(controls))element.classList.add('mist-control');
      if(element.matches('.laminate-scene'))element.classList.add('mist-volume');
    });
    surfaces.forEach(element=>element.classList.add('mist-surface'));
    body.classList.add('mist-ready');
    const observer=new IntersectionObserver(entries=>{
      let order=0;
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          if(!entry.target.classList.contains('is-mist-clear'))appear(entry.target,Math.min(order++*30,180));
        }
      });
    },{threshold:0,rootMargin:'0px 0px -36px 0px'});
    // Re-arm outside a separate, wider boundary so forming elements cannot
    // repeatedly trigger entry and exit at the visible edge of the screen.
    const departure=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting && !focused(entry.target) && enabled){
        clear(entry.target);entry.target.classList.remove('is-mist-clear');
      }
    }),{threshold:0,rootMargin:'160px 0px 160px 0px'});
    [...nodes,...surfaces].forEach(element=>observer.observe(element));
    [...nodes,...surfaces].forEach(element=>departure.observe(element));

    document.addEventListener('focusin',revealFocus,true);
    document.addEventListener('pointerdown',revealFocus,true);
    document.addEventListener('invalid',revealFocus,true);
    document.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{
      if(details.open)replay(details.querySelector('p'));
    }));
    document.addEventListener('arb:sectorchange',event=>replay(event.detail?.panel));
    document.querySelectorAll('dialog:not(#privacy-sheet)').forEach(dialog=>new MutationObserver(()=>{
      if(dialog.open)replay(dialog);else nodes.filter(element=>dialog.contains(element)).forEach(clear);
    }).observe(dialog,{attributes:true,attributeFilter:['open']}));
    const menu=document.querySelector('#primary-nav');
    if(menu)new MutationObserver(()=>{if(menu.classList.contains('is-open'))replay(menu);}).observe(menu,{attributes:true,attributeFilter:['class']});

    function preference() {
      enabled=!reduce.matches;
      [...nodes,...surfaces].forEach(element=>{
        clear(element);
        if(enabled && !visible(element) && !focused(element))element.classList.remove('is-mist-clear');
      });
    }
    if(reduce.addEventListener)reduce.addEventListener('change',preference);else reduce.addListener(preference);
    window.addEventListener('beforeprint',()=>[...nodes,...surfaces].forEach(clear));
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)[...active.keys()].forEach(clear);
      else [...nodes,...surfaces].filter(visible).forEach(clear);
    });
    if(!enabled)preference();
  } catch {
    [...active.keys()].forEach(clear);
    body.classList.remove('mist-ready');
  }
})();
