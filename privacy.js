(() => {
  'use strict';
  const sheet=document.getElementById('privacy-sheet');
  if(!sheet || typeof sheet.showModal!=='function')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let opener=null, closing=false, entry=null, outsideDown=false, savedScrollY=0;
  function open(event) {
    if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    event.preventDefault();
    if(sheet.open)return;
    opener=event.currentTarget;
    savedScrollY=window.scrollY;
    sheet.showModal();
    document.body.classList.add('privacy-open');
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
        await sheet.animate([
          {opacity:1,filter:'blur(0)',transform:'translateY(0) scale(1)'},
          {opacity:0,filter:'blur(6px)',transform:'translateY(9px) scale(.987)'}
        ],{duration:220,easing:'ease-in',fill:'forwards'}).finished;
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
    body.scrollTo({top:body.scrollTop+target.getBoundingClientRect().top-body.getBoundingClientRect().top-12,behavior:reduced.matches?'instant':'smooth'});
    target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  }));
  sheet.querySelectorAll('[data-close-privacy]').forEach(button=>button.addEventListener('click',close));
  sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
  const outside=event=>{const r=sheet.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  sheet.addEventListener('pointerdown',event=>{outsideDown=event.target===sheet&&outside(event);});
  sheet.addEventListener('click',event=>{if(outsideDown&&event.target===sheet&&outside(event))close();outsideDown=false;});
  sheet.addEventListener('close',()=>{
    sheet.getAnimations().forEach(animation=>animation.cancel());
    sheet.classList.remove('is-closing');
    document.body.classList.remove('privacy-open');
    window.scrollTo({top:savedScrollY,behavior:'instant'});
    closing=false;
    opener?.focus({preventScroll:true});
    opener=null;
  });
})();
