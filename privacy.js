(() => {
  'use strict';
  const sheet=document.getElementById('privacy-sheet');
  if(!sheet || typeof sheet.showModal!=='function')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let opener=null, closing=false, entry=null, exitAnimation=null, outsideDown=false, savedScrollX=0, savedScrollY=0;
  let savedOffsets=[];
  const offsetNames=['--privacy-scroll-x','--privacy-scroll-y'];
  function lockPage() {
    savedScrollX=window.scrollX;
    savedScrollY=window.scrollY;
    savedOffsets=offsetNames.map(name=>({value:document.body.style.getPropertyValue(name),priority:document.body.style.getPropertyPriority(name)}));
    document.body.style.setProperty(offsetNames[0],`${-savedScrollX}px`);
    document.body.style.setProperty(offsetNames[1],`${-savedScrollY}px`);
    document.body.classList.add('privacy-open');
  }
  function unlockPage() {
    const rootStyle=document.documentElement.style;
    const behavior=rootStyle.getPropertyValue('scroll-behavior');
    const priority=rootStyle.getPropertyPriority('scroll-behavior');
    // A fixed body also stops background rubber-band scrolling in iOS Safari.
    // Temporarily disable CSS smooth scrolling so the saved position restores immediately.
    rootStyle.setProperty('scroll-behavior','auto','important');
    document.body.classList.remove('privacy-open');
    offsetNames.forEach((name,index)=>{
      const saved=savedOffsets[index];
      if(saved?.value)document.body.style.setProperty(name,saved.value,saved.priority);
      else document.body.style.removeProperty(name);
    });
    window.scrollTo({left:savedScrollX,top:savedScrollY,behavior:'auto'});
    if(behavior)rootStyle.setProperty('scroll-behavior',behavior,priority);
    else rootStyle.removeProperty('scroll-behavior');
    // Background effects pause resize handling while the page is locked.
    // Refresh their viewport before resuming after a rotation or window resize.
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
  }
  function open(event) {
    if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    event.preventDefault();
    if(sheet.open)return;
    opener=event.currentTarget;
    lockPage();
    sheet.showModal();
    sheet.querySelector('.privacy-sheet__body').scrollTop=0;
    sheet.querySelector('[data-close-privacy]').focus({preventScroll:true});
    if(!reduced.matches && sheet.animate) {
      entry=sheet.animate([
        {opacity:0,filter:'blur(9px)',transform:'translateY(18px) scale(.975)'},
        {opacity:1,filter:'blur(0)',transform:'translateY(0) scale(1)'}
      ],{duration:460,easing:'cubic-bezier(.2,.75,.2,1)'});
    }
  }
  async function close() {
    if(!sheet.open||closing)return;
    closing=true;
    entry?.cancel();
    sheet.classList.add('is-closing');
    if(!reduced.matches && sheet.animate) {
      try {
        exitAnimation=sheet.animate([
          {opacity:1,filter:'blur(0)',transform:'translateY(0) scale(1)'},
          {opacity:0,filter:'blur(6px)',transform:'translateY(9px) scale(.987)'}
        ],{duration:220,easing:'ease-in',fill:'forwards'});
        await exitAnimation.finished;
      } catch { /* Reduced motion or navigation can cancel the transition. */ }
    }
    sheet.close();
  }
  document.querySelectorAll('[data-privacy-link]').forEach(link=>link.addEventListener('click',open));
  sheet.querySelectorAll('a[href^="#sheet-"]').forEach(link=>link.addEventListener('click',event=>{
    const target=document.getElementById(link.getAttribute('href').slice(1));
    if(!target)return;
    event.preventDefault();
    const body=sheet.querySelector('.privacy-sheet__body');
    body.scrollTo({top:body.scrollTop+target.getBoundingClientRect().top-body.getBoundingClientRect().top-12,behavior:reduced.matches?'auto':'smooth'});
    target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  }));
  sheet.querySelectorAll('[data-close-privacy]').forEach(button=>button.addEventListener('click',close));
  sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
  const outside=event=>{const r=sheet.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  sheet.addEventListener('pointerdown',event=>{outsideDown=event.target===sheet&&outside(event);});
  sheet.addEventListener('pointercancel',()=>{outsideDown=false;});
  sheet.addEventListener('click',event=>{if(outsideDown&&event.target===sheet&&outside(event))close();outsideDown=false;});
  sheet.addEventListener('close',()=>{
    entry?.cancel();
    exitAnimation?.cancel();
    entry=null;
    exitAnimation=null;
    sheet.classList.remove('is-closing');
    unlockPage();
    closing=false;
    outsideDown=false;
    opener?.focus({preventScroll:true});
    opener=null;
  });
})();
