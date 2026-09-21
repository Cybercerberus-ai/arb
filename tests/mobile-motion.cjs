'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../space-scene.js'), 'utf8');

function events() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    fire(name, extra = {}) {
      const event = { preventDefault() { this.defaultPrevented = true; }, ...extra };
      (listeners.get(name) || []).forEach(callback => callback(event));
      return event;
    }
  };
}

function harness({ coarse = true, reduced = false, largeViewport = true, webgl = true } = {}) {
  const frames = new Map(), media = new Map(), classes = new Set();
  const metrics = { draws: 0, vertexLengths: [], viewports: [] };
  let frameId = 0, time = 2000, contextLost = false;
  const gl = new Proxy({
    MAX_RENDERBUFFER_SIZE: 100, COMPILE_STATUS: 101, LINK_STATUS: 102, NO_ERROR: 0,
    ARRAY_BUFFER: 103, ELEMENT_ARRAY_BUFFER: 104,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: () => ({}),
    getExtension: () => ({}), getError: () => 0,
    getParameter: () => 4096, isContextLost: () => contextLost,
    bufferData(type, values) { if (type === this.ARRAY_BUFFER) metrics.vertexLengths.push(values.length); },
    viewport(...size) { metrics.viewports.push(size); },
    drawElements() { metrics.draws++; }
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  const body = { classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) } };
  const canvas = { ...events(), width: 1, height: 1, style: {}, dataset: {}, setAttribute() {}, getContext: () => webgl ? gl : null };
  const window = {
    ...events(), innerWidth: 850, innerHeight: 1200, devicePixelRatio: 3, scrollY: 0,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia(query) {
      if (!media.has(query)) media.set(query, { ...events(), matches: query.includes('reduced-motion') ? reduced : query.includes('coarse') ? coarse : !coarse });
      return media.get(query);
    },
    CSS: { supports: () => largeViewport }
  };
  let largeHeight = 1200;
  Object.defineProperty(canvas, 'clientHeight', { get: () => canvas.style.height === '100lvh' ? largeHeight : parseFloat(canvas.style.height) || window.innerHeight });
  const document = {
    ...events(), body, hidden: false,
    documentElement: { ...events(), scrollHeight: 6000 },
    getElementById: () => canvas, querySelector: () => null, querySelectorAll: () => []
  };
  vm.runInNewContext(source, { window, document, performance: { now: () => 0 }, CSS: window.CSS });
  const settle = () => {
    let count = 0;
    while (frames.size && count++ < 300) {
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => callback(time)); time += 16;
    }
    assert.ok(count < 300, 'animation must stop when settled');
  };
  settle();
  return { window, document, canvas, body, metrics, media, frames, settle,
    setLargeHeight: value => { largeHeight = value; },
    setContextLost: value => { contextLost = value; }
  };
}

test('touch tablets receive a bounded pixel and geometry budget', () => {
  const touch = harness(), desktop = harness({ coarse: false });
  assert.equal(touch.canvas.dataset.renderer, 'webgl');
  assert.ok(touch.canvas.width * touch.canvas.height <= 2252000);
  assert.ok(touch.metrics.vertexLengths[0] < desktop.metrics.vertexLengths[0]);
  assert.equal(touch.canvas.style.height, '100lvh');
  assert.equal(desktop.canvas.width, 1700);
});

test('mobile browser bars and keyboard do not reallocate the canvas', () => {
  const app = harness();
  const height = app.canvas.height, draws = app.metrics.draws;
  app.window.innerHeight = 600;
  app.window.fire('resize'); app.settle();
  assert.equal(app.canvas.height, height);
  assert.equal(app.metrics.draws, draws);
});

test('older engines retain a stable height and rotation resizes the artwork', () => {
  const app = harness({ largeViewport: false });
  assert.equal(app.canvas.style.height, '1200px');
  app.window.innerHeight = 700;
  app.window.fire('resize'); app.settle();
  assert.equal(app.canvas.style.height, '1200px');
  app.window.innerWidth = 1200; app.window.innerHeight = 850;
  app.window.fire('resize'); app.settle();
  assert.equal(app.canvas.style.height, '850px');
  assert.ok(app.canvas.width > app.canvas.height);
});

test('touch movement and locked privacy background schedule no animation', () => {
  const app = harness();
  const draws = app.metrics.draws;
  app.window.fire('pointermove', { pointerType: 'touch', clientX: 50, clientY: 100 });
  app.body.classList.add('privacy-open');
  app.window.scrollY = 500;
  app.window.fire('scroll'); app.window.fire('resize'); app.settle();
  assert.equal(app.metrics.draws, draws);
  app.body.classList.remove('privacy-open');
  app.window.fire('scroll'); app.settle();
  assert.ok(app.metrics.draws > draws);
});

test('closing privacy refreshes artwork after rotation or desktop resizing while the page was locked', () => {
  for (const options of [{ coarse: true, largeViewport: false }, { coarse: false, reduced: true }]) {
    const app = harness(options);
    const style = () => {
      const properties = new Map();
      return {
        getPropertyValue: name => properties.get(name)?.value || '',
        getPropertyPriority: name => properties.get(name)?.priority || '',
        setProperty: (name, value, priority = '') => properties.set(name, { value, priority }),
        removeProperty: name => properties.delete(name)
      };
    };
    const opener = { ...events(), focus() {} };
    const closeButton = { ...events(), focus() {} };
    const sheetBody = { scrollTop: 0 };
    const sheet = {
      ...events(), open: false,
      classList: { add() {}, remove() {} },
      showModal() { this.open = true; },
      close() { this.open = false; this.fire('close'); },
      querySelector: selector => selector === '.privacy-sheet__body' ? sheetBody : closeButton,
      querySelectorAll: selector => selector === '[data-close-privacy]' ? [closeButton] : []
    };
    app.body.style = style();
    app.document.documentElement.style = style();
    app.document.getElementById = id => id === 'privacy-sheet' ? sheet : app.canvas;
    app.document.querySelectorAll = selector => selector === '[data-privacy-link]' ? [opener] : [];
    app.window.scrollX = 0;
    app.window.scrollTo = options => { app.window.scrollX = options.left; app.window.scrollY = options.top; };
    app.window.dispatchEvent = event => app.window.fire(event.type);
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../privacy.js'), 'utf8'), {
      window: app.window, document: app.document, Event, matchMedia: query => app.window.matchMedia(query)
    });
    opener.fire('click', { button: 0, currentTarget: opener });
    assert.equal(app.body.classList.contains('privacy-open'), true);
    const before = { width: app.canvas.width, height: app.canvas.height, draws: app.metrics.draws };
    app.window.innerWidth = 1200;
    app.window.innerHeight = 850;
    app.window.fire('resize'); app.settle();
    assert.equal(app.canvas.width, before.width);
    assert.equal(app.canvas.height, before.height);
    assert.equal(app.metrics.draws, before.draws, 'The locked background must stay paused');
    closeButton.fire('click'); app.settle();
    assert.equal(app.body.classList.contains('privacy-open'), false);
    assert.ok(app.canvas.width > app.canvas.height, 'The artwork must adopt landscape dimensions after closing');
    assert.ok(Math.abs(app.canvas.width / app.canvas.height - 1200 / 850) < 0.002);
    if (options.coarse) assert.equal(app.canvas.style.height, '850px', 'Legacy viewport fallback must use the new orientation');
  }
});

test('reduced motion and background tabs stop the render loop', () => {
  const reduced = harness({ reduced: true });
  const draws = reduced.metrics.draws;
  reduced.window.scrollY = 500; reduced.window.fire('scroll'); reduced.settle();
  assert.equal(reduced.metrics.draws, draws);
  const app = harness();
  app.window.scrollY = 500; app.window.fire('scroll');
  assert.ok(app.frames.size);
  app.document.hidden = true; app.document.fire('visibilitychange');
  assert.equal(app.frames.size, 0);
  app.document.hidden = false; app.document.fire('visibilitychange'); app.settle();
  assert.equal(app.frames.size, 0);
});

test('WebGL context can be restored after the browser reclaims mobile GPU memory', () => {
  const app = harness();
  app.setContextLost(true);
  const lost = app.canvas.fire('webglcontextlost');
  assert.equal(lost.defaultPrevented, true);
  assert.equal(app.canvas.dataset.renderer, 'unavailable');
  assert.equal(app.frames.size, 0);
  app.setContextLost(false);
  app.canvas.fire('webglcontextrestored'); app.settle();
  assert.equal(app.canvas.dataset.renderer, 'webgl');
  assert.equal(app.body.classList.contains('space-rendered'), true);
  assert.ok(app.metrics.viewports.length >= 2, 'restored context receives a viewport');
});

test('unavailable WebGL leaves the CSS/image fallback usable', () => {
  const app = harness({ webgl: false });
  assert.equal(app.canvas.dataset.renderer, 'unavailable');
  assert.equal(app.body.classList.contains('space-rendered'), false);
  assert.equal(app.frames.size, 0);
});
