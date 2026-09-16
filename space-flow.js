(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touch = window.matchMedia('(pointer: coarse)');
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const planes = [...document.querySelectorAll('.space-plane')].map((element,index) => ({element,index,top:0,height:0,x:0,z:0,rx:0,ry:0,tx:0,tz:0,trx:0,try:0}));
  const stops = [...document.querySelectorAll('.flight-nav a')].map(link=>({link,section:document.querySelector(link.getAttribute('href'))}));
  const percent = document.querySelector('#flight-percent');
  let enabled = !reduce.matches;
  let frame = 0;
  let lastTime = 0;
  let dirty = true;
  let measureDirty = true;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight || 1;
  function layoutTop(element) {
    let top=0;
    for(let node=element;node;node=node.offsetParent) top+=node.offsetTop;
    return top;
  }
  function measure() {
    planes.forEach(plane=>{plane.top=layoutTop(plane.element);plane.height=plane.element.offsetHeight;});
    stops.forEach(stop=>{if(stop.section)stop.top=layoutTop(stop.section);});
    measureDirty=false;
  }
  function requestFrame() {
    if(!frame && !document.hidden && !document.body.classList.contains('privacy-open'))frame=requestAnimationFrame(render);
  }
  function update() {
    const y=window.scrollY, vh=viewportHeight;
    const max=Math.max(1,document.documentElement.scrollHeight-vh);
    if(percent)percent.textContent=String(Math.round(clamp(y/max,0,1)*100)).padStart(2,'0');
    let active=stops[0];
    stops.forEach(stop=>{if(stop.top<=y+vh*.35)active=stop;});
    stops.forEach(stop=>{
      const current=stop===active;
      stop.link.classList.toggle('is-current',current);
      if(current)stop.link.setAttribute('aria-current','location');else stop.link.removeAttribute('aria-current');
    });
    if(!enabled)return;
    planes.forEach(plane=>{
      const top=plane.top-y, bottom=top+plane.height;
      const distance=top>vh*.6 ? clamp((top-vh*.6)/(vh*.9),0,1) : bottom<vh*.4 ? clamp((bottom-vh*.4)/(vh*.9),-1,0) : 0;
      const light=touch.matches ? .32 : 1;
      plane.tx=distance*(plane.index%2 ? -26 : 26)*light;
      plane.tz=(distance>0 ? -distance*300 : -distance*100)*light;
      plane.trx=distance*3*light;
      plane.try=distance*(plane.index%2 ? -3 : 3)*light;
    });
    dirty=false;
  }
  function render(time) {
    frame=0;
    if(document.hidden || document.body.classList.contains('privacy-open'))return;
    if(measureDirty)measure();
    if(dirty)update();
    if(!enabled)return;
    const dt=lastTime ? Math.min(48,time-lastTime) : 16;
    const blend=1-Math.exp(-dt/90);
    let moving=false;
    planes.forEach(plane=>{
      [['x','tx','px'],['z','tz','px'],['rx','trx','deg'],['ry','try','deg']].forEach(([key,target,unit])=>{
        const delta=plane[target]-plane[key];
        if(Math.abs(delta)>.025){plane[key]+=delta*blend;moving=true;}else plane[key]=plane[target];
        const value=`${Number(plane[key].toFixed(3))}${unit}`;
        if(plane.element.style.getPropertyValue(`--plane-${key}`)!==value)plane.element.style.setProperty(`--plane-${key}`,value);
      });
    });
    lastTime=moving?time:0;
    if(moving)requestFrame();
  }
  function preference() {
    enabled=!reduce.matches;
    document.body.classList.toggle('space-travel',enabled);
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    if(!enabled)planes.forEach(plane=>{
      ['x','z','rx','ry'].forEach(key=>{plane[key]=0;plane.element.style.removeProperty(`--plane-${key}`);});
    });
    dirty=true;requestFrame();
  }
  window.addEventListener('scroll',()=>{dirty=true;requestFrame();},{passive:true});
  window.addEventListener('resize',()=>{
    if(document.body.classList.contains('privacy-open'))return;
    if(touch.matches && window.innerWidth===viewportWidth)return;
    viewportWidth=window.innerWidth;viewportHeight=window.innerHeight||1;
    measureDirty=true;dirty=true;requestFrame();
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}else{dirty=true;requestFrame();}
  });
  // Expanding the FAQ changes layout; subsequent chapter positions must remain exact.
  if('ResizeObserver' in window){
    const observer=new ResizeObserver(()=>{measureDirty=true;dirty=true;requestFrame();});
    document.querySelectorAll('main>section,footer').forEach(element=>observer.observe(element));
  }
  if(reduce.addEventListener)reduce.addEventListener('change',preference);else reduce.addListener(preference);
  if(touch.addEventListener)touch.addEventListener('change',preference);else touch.addListener(preference);
  preference();
})();
