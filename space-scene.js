(() => {
  'use strict';
  const canvas = document.getElementById('space-canvas');
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const touch = window.matchMedia('(pointer: coarse)');
  const clamp = (number, low = 0, high = 1) => Math.min(high, Math.max(low, number));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smooth = amount => amount * amount * (3 - 2 * amount);
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  let gl;
  let failed = false;
  let frame = 0;
  let previousTime = 0;
  const arrivalStarted = performance.now();
  let arrival = reduced.matches ? 1 : 0;
  let layoutDirty = true;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let viewportWidth = window.innerWidth;
  let viewportHeight = Math.max(1, window.innerHeight);
  const largeViewport = window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports('height', '100lvh');
  let scrollRange = 1;
  let stops = [];
  let scrollTarget = window.scrollY;
  let scrollCurrent = scrollTarget;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const programs = [];
  const buffers = [];
  let meshProgram;
  let starProgram;
  let forms;
  let stars;

  const projection = `
    uniform float uAspect;
    uniform vec2 uCenter;
    uniform vec3 uRotation;
    uniform float uScale;
    uniform float uDepth;
    mat3 rotation() {
      vec3 c = cos(uRotation), s = sin(uRotation);
      mat3 rx = mat3(1.,0.,0., 0.,c.x,s.x, 0.,-s.x,c.x);
      mat3 ry = mat3(c.y,0.,-s.y, 0.,1.,0., s.y,0.,c.y);
      mat3 rz = mat3(c.z,s.z,0., -s.z,c.z,0., 0.,0.,1.);
      return rz * ry * rx;
    }
    vec4 project(vec3 p) {
      float depth = 6.2 - p.z - uDepth;
      vec2 position = vec2(p.x * 1.95 / uAspect, p.y * 1.95) + uCenter * depth;
      return vec4(position, depth * 1.002002 - .2002, depth);
    }
  `;
  const meshVertex = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aTangent;
    attribute vec2 aUv;
    attribute float aSide;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vSide;
    ${projection}
    void main() {
      mat3 r = rotation();
      vPosition = r * aPosition * uScale;
      vNormal = r * aNormal;
      vTangent = r * aTangent;
      vUv = aUv;
      vSide = aSide;
      gl_Position = project(vPosition);
    }
  `;
  const meshFragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vSide;
    uniform float uOpacity;
    uniform float uDetail;
    uniform float uArrival;
    uniform vec2 uResolution;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float cloud(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
    }
    void main() {
      vec3 surface = normalize(vNormal);
      if (!gl_FrontFacing) surface = -surface;
      vec3 tangent = normalize(vTangent);
      vec3 bitangent = normalize(cross(surface,tangent));
      vec3 view = normalize(vec3(0.,0.,6.2) - vPosition);
      vec2 uv = vUv * vec2(124.,32.);
      float detail = uDetail, fiberDetail = 0.;
      #ifdef WEAVE_DERIVATIVES
        vec2 footprint = fwidth(uv);
        float pixel = max(footprint.x,footprint.y);
        detail *= 1.-smoothstep(.40,1.3,pixel);
        fiberDetail = 1.-smoothstep(.035,.15,pixel);
      #endif
      float twill = step(2., mod(floor(uv.x)-floor(uv.y),4.));
      float strand = mix(fract(uv.x),fract(uv.y),twill);
      float roll = sin(strand*3.14159265);
      float seam = smoothstep(0.,.09,strand)*(1.-smoothstep(.91,1.,strand));
      float filaments = sin(strand*75.398)*fiberDetail;
      vec3 across = mix(tangent,bitangent,twill);
      vec3 n = normalize(surface+across*cos(strand*3.14159265)*.115*detail);
      vec3 light = normalize(vec3(1.2,-.8,2.8));
      vec3 halfVector = normalize(light+view);
      float diffuse = max(dot(n,light),0.);
      float bundle = mix(.75,(.49+.51*roll)*(.72+.28*seam),detail);
      vec3 color = vec3(.023,.029,.036)*bundle*(.9+diffuse*1.7);
      // Orthogonal fiber bundles catch the studio reflection differently.
      vec3 fiber = mix(bitangent,tangent,twill);
      float longitudinal = dot(halfVector,fiber);
      float crosswise = dot(halfVector,across);
      float anisotropy = exp(-(longitudinal*longitudinal*5.+crosswise*crosswise*42.));
      color += vec3(.22,.25,.28)*anisotropy*bundle*(.5+.5*detail);
      vec3 reflected = reflect(-view,n);
      float softbox = exp(-pow((reflected.x-.38)/.32,2.))*(.4+.6*smoothstep(-.95,.55,reflected.y));
      float strip = exp(-pow((reflected.y+.58)/.18,2.))*.9;
      float clearcoat = pow(max(dot(surface,halfVector),0.),54.);
      color += vec3(.58,.62,.66)*(softbox*.43+strip*.3)*(.55+.45*bundle);
      color += vec3(.74,.78,.81)*clearcoat*.33;
      color += filaments*.008;
      float rim = pow(1.-abs(dot(surface,view)),3.);
      color += vec3(.21,.25,.29)*rim*.35;
      float edge = 1.-smoothstep(.003,.014,vUv.y);
      color = mix(color,vec3(.50,.025,.033)*(.6+diffuse*.4),edge*.86*(1.-vSide));
      vec3 edgeColor = vec3(.10,.12,.145)*(.5+diffuse)+vec3(.30,.34,.38)*clearcoat;
      color = mix(color,edgeColor,vSide);
      // A restrained tone curve keeps highlights silver and the weave graphite.
      color = pow(max(color,vec3(0.)),vec3(.83));
      vec2 screen = gl_FragCoord.xy/uResolution;
      float haze = cloud(screen*4.2)+cloud(screen*9.3)*.28;
      float emergence = smoothstep(haze*.23,.74+haze*.19,uArrival);
      float edgeMist = smoothstep(.025,.18,screen.y)*(1.-smoothstep(.87,1.,screen.y));
      color = mix(vec3(.96,.975,.98),color,smoothstep(.05,.80,emergence));
      gl_FragColor = vec4(color,uOpacity*emergence*edgeMist);
    }
  `;
  const starVertex = `
    attribute vec3 aPosition;
    attribute float aSize;
    uniform float uTravel;
    uniform float uAspect;
    uniform float uDpr;
    uniform vec2 uPointer;
    varying float vAlpha;
    void main(){
      float depth=mod(aPosition.z-uTravel+128.,64.)+1.;
      vec2 drift=vec2(sin(uTravel*.035)*.45,cos(uTravel*.022)*.22)+uPointer*.25;
      vec2 position=(aPosition.xy-drift)*vec2(1.65/uAspect,1.65);
      gl_Position=vec4(position,depth*1.002002-.2002,depth);
      gl_PointSize=clamp((.8+5./depth)*aSize*uDpr,1.,4.2*uDpr);
      vAlpha=(.17+aSize*.17)*smoothstep(1.,4.,depth)*(1.-smoothstep(48.,65.,depth));
    }
  `;
  const starFragment = `
    precision mediump float; varying float vAlpha;
    void main(){vec2 p=gl_PointCoord-.5;float a=1.-smoothstep(.12,.5,length(p));gl_FragColor=vec4(.32,.39,.44,vAlpha*a*.6);}
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Scene shader unavailable');
    }
    return shader;
  }

  function program(vertex, fragment, attributes, uniforms) {
    const vertexShader = compile(gl.VERTEX_SHADER, vertex);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
    const result = gl.createProgram();
    gl.attachShader(result, vertexShader);
    gl.attachShader(result, fragmentShader);
    gl.linkProgram(result);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
      gl.deleteProgram(result);
      throw new Error('Scene program unavailable');
    }
    programs.push(result);
    const locations = {};
    attributes.forEach(name => { locations[name] = gl.getAttribLocation(result, name); });
    uniforms.forEach(name => { locations[name] = gl.getUniformLocation(result, name); });
    return { program: result, ...locations };
  }

  function buffer(data, element = false) {
    const result = gl.createBuffer();
    const type = element ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
    gl.bindBuffer(type, result);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    buffers.push(result);
    return result;
  }

  // Open, gently cambered sheets echo the original carbon photograph.
  function surfacePoint(u, v, variant) {
    const arc = Math.sin(u * Math.PI);
    const taper = .26 + .74 * Math.pow(Math.max(0, arc), .55);
    const transverse = v * (.49 - variant * .035) * taper;
    const twist = -.45 + u * (1.15 + variant * .1);
    return [
      (u - .5) * 3.7,
      arc * (.66 + variant * .1) - .36 + transverse * Math.cos(twist),
      arc * .3 + Math.cos(u * Math.PI) * .17 + transverse * Math.sin(twist) + .07 * (1 - v * v)
    ];
  }

  function createForm(variant) {
    const vertices = [], indices = [];
    const columns = touch.matches ? 96 : 160, rows = touch.matches ? 20 : 32;
    const perimeter = [];
    const addVertex = (point, normal, tangent, u, v, side) => {
      const index = vertices.length / 12;
      vertices.push(...point,...normal,...tangent,u,v,side);
      return index;
    };
    for (let i = 0; i <= columns; i++) {
      const u = i / columns;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows * 2 - 1;
        const point = surfacePoint(u, v, variant);
        const nextU = Math.min(1, u + .0001), previousU = Math.max(0, u - .0001);
        const before = surfacePoint(previousU, v, variant);
        const du = surfacePoint(nextU, v, variant).map((value, axis) => value - before[axis]);
        const dv = surfacePoint(u, v + .0001, variant).map((value, axis) => value - point[axis]);
        const normal = [du[1]*dv[2]-du[2]*dv[1],du[2]*dv[0]-du[0]*dv[2],du[0]*dv[1]-du[1]*dv[0]];
        const length = Math.hypot(...normal) || 1;
        const tangentLength = Math.hypot(...du) || 1;
        addVertex(point,normal.map(value => value/length),du.map(value => value/tangentLength),u,j/rows,0);
        if (i < columns && j < rows) {
          const a = i * (rows + 1) + j, b = a + rows + 1;
          indices.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
    // A thin, closed rim catches light at the actual cut edge of the laminate.
    for (let i=0;i<=columns;i++) perimeter.push(i*(rows+1));
    for (let j=1;j<=rows;j++) perimeter.push(columns*(rows+1)+j);
    for (let i=columns-1;i>=0;i--) perimeter.push(i*(rows+1)+rows);
    for (let j=rows-1;j>0;j--) perimeter.push(j);
    perimeter.forEach((index,i) => {
      const next = perimeter[(i+1)%perimeter.length];
      const p = vertices.slice(index*12,index*12+3), q = vertices.slice(next*12,next*12+3);
      const n = vertices.slice(index*12+3,index*12+6), m = vertices.slice(next*12+3,next*12+6);
      const tangent = q.map((value,axis)=>value-p[axis]);
      const length = Math.hypot(...tangent)||1;
      tangent.forEach((value,axis)=>{tangent[axis]=value/length;});
      const rimNormal = [tangent[1]*n[2]-tangent[2]*n[1],tangent[2]*n[0]-tangent[0]*n[2],tangent[0]*n[1]-tangent[1]*n[0]];
      const start = addVertex(p,rimNormal,tangent,0,0,1);
      addVertex(q,rimNormal,tangent,1,0,1);
      addVertex(p.map((value,axis)=>value-n[axis]*.012),rimNormal,tangent,0,1,1);
      addVertex(q.map((value,axis)=>value-m[axis]*.012),rimNormal,tangent,1,1,1);
      indices.push(start,start+1,start+2,start+1,start+3,start+2);
    });
    return { vertices: buffer(new Float32Array(vertices)), indices: buffer(new Uint16Array(indices), true), count: indices.length };
  }

  function createGeometry() {
    forms = [0,1,2].map(createForm);
    let seed = 981027;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const starData = [];
    for (let i = 0; i < 120; i++) starData.push((random()-.5)*52,(random()-.5)*34,random()*64,.55+random()*.7);
    stars = { vertices: buffer(new Float32Array(starData)), count: 120 };
  }

  function measure() {
    layoutDirty = false;
    width = Math.max(1, window.innerWidth);
    // A stable large viewport avoids reallocating GPU buffers as mobile bars or
    // the keyboard resize the visual viewport. Older engines retain the height
    // from the last width/orientation change instead.
    canvas.style.height = touch.matches ? (largeViewport ? '100lvh' : `${viewportHeight}px`) : '100%';
    height = Math.max(1, touch.matches ? (canvas.clientHeight || viewportHeight) : window.innerHeight);
    const pixelBudget = touch.matches ? 2250000 : 5000000;
    const maximumDimension = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const density = touch.matches ? (window.devicePixelRatio || 1) : Math.max(window.devicePixelRatio || 1,width<700 ? 1.25 : 1.5);
    dpr = Math.min(density,touch.matches ? 1.5 : 2,Math.sqrt(pixelBudget/(width*height)),maximumDimension/width,maximumDimension/height);
    const pixelWidth = Math.round(width*dpr), pixelHeight = Math.round(height*dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    gl.viewport(0,0,pixelWidth,pixelHeight);
    scrollRange = Math.max(1,document.documentElement.scrollHeight-height);
    const sections = [
      ['.hero',.62,-.03,1.06,.3,-.24,.92,.96],
      ['#o-nas',-.91,-.06,.88,.58,.24,1.22,.16],
      ['#mozliwosci',.93,.15,.94,-.2,-.35,.48,.18],
      ['.material-feature',-.91,-.06,.83,.4,.4,1.12,.10],
      ['#wspolpraca',.96,.16,.85,.58,-.18,.64,.16],
      ['#kontakt',.92,.32,.84,.22,.4,1.0,.18]
    ];
    stops = sections.map(([selector,x,y,scale,rx,ry,rz,opacity], index) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const top = element.getBoundingClientRect().top + window.scrollY;
      return { at: index ? Math.max(0,top-height*.18) : 0, x,y,scale,rx,ry,rz,opacity };
    }).filter(Boolean).sort((a,b) => a.at-b.at);
  }

  function scenePosition(scroll) {
    if (!stops.length) return {x:.62,y:-.03,scale:1.06,rx:.3,ry:-.24,rz:.92,opacity:.96};
    let left = stops[0], right = stops[stops.length-1];
    for (let i = 1; i < stops.length; i++) {
      if (scroll <= stops[i].at) { left = stops[i-1]; right = stops[i]; break; }
      left = stops[i];
    }
    const amount = left === right ? 0 : smooth(clamp((scroll-left.at)/Math.max(1,right.at-left.at)));
    const result = {};
    ['x','y','scale','rx','ry','rz','opacity'].forEach(key => { result[key] = mix(left[key],right[key],amount); });
    if (width < 700) {
      result.x *= .59;
      result.y -= .2;
      result.scale *= width / height < .7 ? .68 : .8;
      result.opacity *= .75;
    }
    return result;
  }

  function objectUniforms(shader, position) {
    gl.uniform1f(shader.uAspect,width/height);
    const parallax = position.parallax || 1;
    gl.uniform2f(shader.uCenter,position.x+pointer.x*.022*parallax,position.y-pointer.y*.016*parallax);
    gl.uniform3f(shader.uRotation,position.rx+pointer.y*.045,position.ry+pointer.x*.07,position.rz);
    gl.uniform1f(shader.uScale,position.scale);
    gl.uniform1f(shader.uDepth,position.depth-(1-smooth(arrival))*3.8);
  }

  function formation(position, scroll) {
    const journey = clamp(scroll / scrollRange);
    const compact = width < 700;
    const hero = 1 - smooth(clamp(scroll / Math.max(height * .72, 1)));
    return [
      { ...position, mesh:forms[0], depth:0, detail:1, parallax:1 },
      { x:mix(compact ? .74 : .47,.84,journey), y:.48-Math.sin(journey*Math.PI)*.12,
        scale:compact ? .39 : .56, rx:-.36+journey*.3, ry:.28, rz:-.38+journey*.45,
        opacity:mix(.17,.62,hero), depth:-1.6, detail:.6, parallax:.6, mesh:forms[1] },
      { x:mix(compact ? .64 : .30,-.91,smooth(journey)), y:-.70+Math.sin(journey*Math.PI)*.17,
        scale:compact ? .28 : .39, rx:.48, ry:-.32+journey*.4, rz:-.50-journey*.6,
        opacity:mix(.14,.78,hero), depth:.5, detail:.4, parallax:1.4, mesh:forms[2] }
    ].sort((a,b) => a.depth-b.depth);
  }

  function render() {
    const scroll = reduced.matches ? 0 : scrollCurrent;
    const position = scenePosition(scroll);
    gl.depthMask(true);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(starProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,stars.vertices);
    gl.enableVertexAttribArray(starProgram.aPosition);
    gl.vertexAttribPointer(starProgram.aPosition,3,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(starProgram.aSize);
    gl.vertexAttribPointer(starProgram.aSize,1,gl.FLOAT,false,16,12);
    gl.uniform1f(starProgram.uTravel,clamp(scroll/scrollRange)*46);
    gl.uniform1f(starProgram.uAspect,width/height);
    gl.uniform1f(starProgram.uDpr,dpr);
    gl.uniform2f(starProgram.uPointer,pointer.x,pointer.y);
    gl.drawArrays(gl.POINTS,0,stars.count);
    gl.disableVertexAttribArray(starProgram.aSize);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // The separated sheets are translucent in the fog; draw far to near without
    // writing depth so a faint front sheet never cuts a hole in another one.
    gl.depthMask(false);
    gl.useProgram(meshProgram.program);
    gl.enableVertexAttribArray(meshProgram.aPosition);
    gl.enableVertexAttribArray(meshProgram.aNormal);
    gl.enableVertexAttribArray(meshProgram.aTangent);
    gl.enableVertexAttribArray(meshProgram.aUv);
    gl.enableVertexAttribArray(meshProgram.aSide);
    gl.uniform2f(meshProgram.uResolution,canvas.width,canvas.height);
    formation(position,scroll).forEach(form => {
      gl.bindBuffer(gl.ARRAY_BUFFER,form.mesh.vertices);
      gl.vertexAttribPointer(meshProgram.aPosition,3,gl.FLOAT,false,48,0);
      gl.vertexAttribPointer(meshProgram.aNormal,3,gl.FLOAT,false,48,12);
      gl.vertexAttribPointer(meshProgram.aTangent,3,gl.FLOAT,false,48,24);
      gl.vertexAttribPointer(meshProgram.aUv,2,gl.FLOAT,false,48,36);
      gl.vertexAttribPointer(meshProgram.aSide,1,gl.FLOAT,false,48,44);
      objectUniforms(meshProgram,form);
      gl.uniform1f(meshProgram.uOpacity,form.opacity);
      gl.uniform1f(meshProgram.uDetail,form.detail);
      gl.uniform1f(meshProgram.uArrival,clamp((arrival-(1-form.detail)*.16)/.88));
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,form.mesh.indices);
      gl.drawElements(gl.TRIANGLES,form.mesh.count,gl.UNSIGNED_SHORT,0);
    });
    gl.depthMask(true);
    gl.disableVertexAttribArray(meshProgram.aNormal);
    gl.disableVertexAttribArray(meshProgram.aTangent);
    gl.disableVertexAttribArray(meshProgram.aUv);
    gl.disableVertexAttribArray(meshProgram.aSide);
  }

  function fail() {
    failed = true;
    window.cancelAnimationFrame(frame);
    frame = 0;
    document.body.classList.remove('space-rendered');
    canvas.dataset.renderer = 'unavailable';
    if (gl && !gl.isContextLost()) {
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      buffers.forEach(item => gl.deleteBuffer(item));
      programs.forEach(item => gl.deleteProgram(item));
    }
    buffers.length = programs.length = 0;
  }

  function schedule() {
    if (!failed && !document.hidden && !document.body.classList.contains('privacy-open') && !frame) frame = window.requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    if (failed || document.hidden || document.body.classList.contains('privacy-open')) return;
    try {
      if (layoutDirty) measure();
      const elapsed = previousTime ? clamp(time-previousTime,1,48) : 16;
      previousTime = time;
      const blend = 1-Math.exp(-elapsed/115);
      arrival = reduced.matches ? 1 : clamp((time-arrivalStarted)/1800);
      if (reduced.matches) {
        scrollCurrent = 0;
        pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
      } else {
        scrollCurrent = mix(scrollCurrent,scrollTarget,blend);
        pointer.x = mix(pointer.x,pointer.targetX,blend);
        pointer.y = mix(pointer.y,pointer.targetY,blend);
      }
      const moving = !reduced.matches && (Math.abs(scrollCurrent-scrollTarget)>.15 || Math.abs(pointer.x-pointer.targetX)>.0008 || Math.abs(pointer.y-pointer.targetY)>.0008);
      if (!moving && !reduced.matches) {
        scrollCurrent = scrollTarget;
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
      render();
      if (moving || arrival<1) schedule();
      else previousTime = 0;
    } catch { fail(); }
  }

  function initialize() {
    failed = false;
    previousTime = 0;
    buffers.length = programs.length = 0;
    try {
      gl = canvas.getContext('webgl',{ alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'low-power' });
      if (!gl) { fail(); return; }
      const shared = ['uAspect','uCenter','uRotation','uScale','uDepth'];
      const derivativeSupport = gl.getExtension('OES_standard_derivatives');
      const fragment = (derivativeSupport ? '#extension GL_OES_standard_derivatives : enable\n#define WEAVE_DERIVATIVES\n' : '')+meshFragment;
      meshProgram = program(meshVertex,fragment,['aPosition','aNormal','aTangent','aUv','aSide'],[...shared,'uOpacity','uDetail','uArrival','uResolution']);
      starProgram = program(starVertex,starFragment,['aPosition','aSize'],['uTravel','uAspect','uDpr','uPointer']);
      createGeometry();
      measure();
      if (reduced.matches) scrollCurrent = 0;
      render();
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Scene rendering unavailable');
      canvas.dataset.renderer = 'webgl';
      document.body.classList.add('space-rendered');
      schedule();
    } catch { fail(); }
  }
  initialize();
  if (failed) return;

  window.addEventListener('scroll',() => {
    if (document.body.classList.contains('privacy-open')) return;
    scrollTarget = window.scrollY;
    if (!reduced.matches) schedule();
  },{passive:true});
  window.addEventListener('resize',() => {
    if (document.body.classList.contains('privacy-open')) return;
    if (touch.matches && window.innerWidth===viewportWidth) return;
    viewportWidth=window.innerWidth;
    viewportHeight=Math.max(1,window.innerHeight);
    layoutDirty=true; schedule();
  },{passive:true});
  window.addEventListener('pointermove',event => {
    if (reduced.matches || !finePointer.matches || event.pointerType==='touch') return;
    pointer.targetX=clamp(event.clientX/width*2-1,-1,1);
    pointer.targetY=clamp(event.clientY/height*2-1,-1,1);
    schedule();
  },{passive:true});
  const resetPointer = () => { pointer.targetX=pointer.targetY=0; if (!reduced.matches) schedule(); };
  document.documentElement.addEventListener('pointerleave',resetPointer,{passive:true});
  window.addEventListener('blur',resetPointer);
  const mediaChange = () => {
    pointer.x=pointer.y=pointer.targetX=pointer.targetY=0;
    scrollTarget=window.scrollY;
    scrollCurrent=reduced.matches?0:scrollTarget;
    previousTime=0;
    layoutDirty=true;
    schedule();
  };
  [reduced,finePointer,touch].forEach(query => {
    if (query.addEventListener) query.addEventListener('change',mediaChange);
    else query.addListener(mediaChange);
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame=0;
      previousTime=0;
    } else {
      scrollTarget=window.scrollY;
      layoutDirty=true;
      schedule();
    }
  });
  // Mobile browsers may reclaim the GPU when another tab/app is foregrounded.
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); fail(); });
  canvas.addEventListener('webglcontextrestored',() => {
    if (!document.body.classList.contains('privacy-open')) scrollTarget=window.scrollY;
    scrollCurrent=reduced.matches?0:scrollTarget;
    initialize();
  });
  window.addEventListener('load',() => { layoutDirty=true; schedule(); },{once:true});
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => { layoutDirty=true; schedule(); });
    document.querySelectorAll('main>section,footer').forEach(section => resizeObserver.observe(section));
  }
})();
