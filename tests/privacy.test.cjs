'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.resolve(__dirname, '../privacy.js'), 'utf8');

function harness({ reduced = false, supportsDialog = true } = {}) {
  let document;
  function element() {
    const listeners = new Map();
    const classes = new Set();
    const styles = new Map();
    return {
      attributes: {}, focusCalls: [], listeners,
      style: {
        getPropertyValue: name => styles.get(name)?.value ?? '',
        getPropertyPriority: name => styles.get(name)?.priority ?? '',
        setProperty: (name, value, priority = '') => styles.set(name, { value, priority }),
        removeProperty: name => styles.delete(name)
      },
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name] ?? null; },
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(callback);
      },
      focus(options) { document.activeElement = this; this.focusCalls.push(options); },
      fire(type, properties = {}) {
        const event = {
          button: 0, currentTarget: this, target: this, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; }, ...properties
        };
        const results = (listeners.get(type) || []).map(callback => callback(event));
        return { event, results };
      }
    };
  }
  const opener = element(), secondOpener = element(), closeButton = element(), returnButton = element();
  opener.setAttribute('href', 'polityka-prywatnosci.html');
  secondOpener.setAttribute('href', 'polityka-prywatnosci.html');
  const toc = element(), target = element();
  toc.setAttribute('href', '#sheet-opis');
  target.getBoundingClientRect = () => ({ top: 360 });
  const body = element();
  body.scrollTop = 420;
  body.scrollCalls = [];
  body.getBoundingClientRect = () => ({ top: 100 });
  body.scrollTo = options => { body.scrollCalls.push(options); body.scrollTop = options.top; };
  const sheet = element();
  sheet.open = false;
  sheet.openCalls = 0;
  sheet.closeCalls = 0;
  sheet.animations = [];
  if (supportsDialog) sheet.showModal = () => { sheet.open = true; sheet.openCalls++; };
  sheet.close = () => {
    sheet.open = false;
    sheet.closeCalls++;
    queueMicrotask(() => sheet.fire('close'));
  };
  sheet.animate = (frames, options) => {
    let finish;
    const animation = {
      frames, options, canceled: false,
      finished: new Promise(resolve => { finish = resolve; }),
      finish() { finish(); },
      cancel() { this.canceled = true; finish(); }
    };
    sheet.animations.push(animation);
    return animation;
  };
  sheet.getAnimations = () => sheet.animations;
  sheet.getBoundingClientRect = () => ({ left: 100, right: 900, top: 50, bottom: 650 });
  sheet.querySelector = selector => selector === '.privacy-sheet__body' ? body : closeButton;
  sheet.querySelectorAll = selector => selector === '[data-close-privacy]' ? [closeButton, returnButton] : [toc];
  const pageBody = element();
  document = {
    body: pageBody, documentElement: element(), activeElement: null,
    getElementById: id => id === 'privacy-sheet' ? sheet : id === 'sheet-opis' ? target : null,
    querySelectorAll: () => [opener, secondOpener]
  };
  const window = {
    scrollX: 0, scrollY: 975, location: { hash: '#zapytanie' }, scrollCalls: [], events: [],
    scrollTo(options) { this.scrollCalls.push({ ...options, rootBehavior: document.documentElement.style.getPropertyValue('scroll-behavior') }); this.scrollX = options.left; this.scrollY = options.top; },
    dispatchEvent(event) { this.events.push(event.type); }
  };
  const preference = { matches: reduced };
  vm.runInNewContext(script, { document, window, Event, matchMedia: () => preference });
  return { document, window, sheet, body, pageBody, opener, secondOpener, closeButton, returnButton, toc, target, preference };
}

async function flushEvents() {
  // Let promises from both VM realms and the dialog's queued close event settle.
  await new Promise(resolve => setImmediate(resolve));
}

test('ordinary links open the sheet, lock the page, reset its scroll and focus the close button', () => {
  const h = harness();
  const { event } = h.opener.fire('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.sheet.openCalls, 1);
  assert.equal(h.sheet.open, true);
  assert.equal(h.pageBody.classList.contains('privacy-open'), true);
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-y'), '-975px');
  assert.equal(h.body.scrollTop, 0);
  assert.equal(h.document.activeElement, h.closeButton);
  assert.equal(h.closeButton.focusCalls[0].preventScroll, true);
  assert.equal(h.sheet.animations.length, 1);
  h.secondOpener.fire('click');
  assert.equal(h.sheet.openCalls, 1, 'An already open sheet must not open twice');
});

test('modified clicks remain normal links and never open or lock the sheet', () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
    const h = harness();
    assert.equal(h.opener.fire('click', modifier).event.defaultPrevented, false);
    assert.equal(h.opener.getAttribute('href'), 'polityka-prywatnosci.html');
    assert.equal(h.sheet.openCalls, 0);
    assert.equal(h.pageBody.classList.contains('privacy-open'), false);
  }
});

test('table of contents scrolls the sheet and moves focus without default hash navigation', () => {
  const h = harness();
  h.opener.fire('click');
  h.body.scrollTop = 120;
  const before = h.window.location.hash;
  const { event } = h.toc.fire('click');
  if (!event.defaultPrevented) h.window.location.hash = h.toc.getAttribute('href');
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.window.location.hash, before);
  assert.equal(h.body.scrollCalls.length, 1);
  assert.equal(h.body.scrollCalls[0].top, 368);
  assert.equal(h.body.scrollCalls[0].behavior, 'smooth');
  assert.equal(h.target.getAttribute('tabindex'), '-1');
  assert.equal(h.document.activeElement, h.target);
  assert.equal(h.target.focusCalls[0].preventScroll, true);
});

test('repeated Escape and close clicks run one exit and restore original opener, scroll and page lock', async () => {
  const h = harness();
  h.opener.fire('click');
  h.secondOpener.fire('click');
  h.window.scrollY = 1300;
  assert.equal(h.sheet.fire('cancel').event.defaultPrevented, true);
  h.returnButton.fire('click');
  h.sheet.fire('cancel');
  h.closeButton.fire('click');
  assert.equal(h.sheet.animations.length, 2, 'Only the entry and one exit animation should exist');
  assert.equal(h.sheet.animations[0].canceled, true);
  assert.equal(h.sheet.closeCalls, 0, 'The dialog stays modal while the exit animation is pending');
  assert.equal(h.pageBody.classList.contains('privacy-open'), true);
  h.sheet.animations[1].finish();
  await flushEvents();
  assert.equal(h.sheet.closeCalls, 1);
  assert.equal(h.sheet.open, false);
  assert.equal(h.sheet.classList.contains('is-closing'), false);
  assert.equal(h.pageBody.classList.contains('privacy-open'), false);
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.opener.focusCalls.at(-1).preventScroll, true);
  assert.equal(h.window.scrollY, 975);
  assert.equal(h.window.scrollCalls.length, 1);
  assert.equal(h.window.scrollCalls[0].behavior, 'auto');
  assert.equal(h.window.scrollCalls[0].rootBehavior, 'auto');
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-y'), '');
  assert.equal(h.document.documentElement.style.getPropertyValue('scroll-behavior'), '');
  assert.deepEqual(h.window.events, ['scroll']);
  assert.ok(h.sheet.animations.every(animation => animation.canceled));
  h.secondOpener.fire('click');
  assert.equal(h.sheet.openCalls, 2, 'Closing must reset state so the sheet can be opened again');
});

test('reduced motion skips animations and uses immediate TOC scrolling and closing', async () => {
  const h = harness({ reduced: true });
  h.opener.fire('click');
  h.toc.fire('click');
  assert.equal(h.body.scrollCalls[0].behavior, 'auto');
  h.returnButton.fire('click');
  await flushEvents();
  assert.equal(h.sheet.animations.length, 0);
  assert.equal(h.sheet.closeCalls, 1);
  assert.equal(h.pageBody.classList.contains('privacy-open'), false);
  assert.equal(h.document.activeElement, h.opener);
});

test('backdrop dismissal requires a pointer gesture starting and ending outside the sheet', async () => {
  const h = harness({ reduced: true });
  h.opener.fire('click');
  h.sheet.fire('pointerdown', { clientX: 200, clientY: 200 });
  h.sheet.fire('click', { clientX: 20, clientY: 20 });
  assert.equal(h.sheet.closeCalls, 0, 'Dragging from content to the backdrop must not dismiss');
  h.sheet.fire('pointerdown', { clientX: 20, clientY: 20 });
  h.sheet.fire('click', { clientX: 200, clientY: 200 });
  assert.equal(h.sheet.closeCalls, 0, 'Ending a gesture inside the sheet must not dismiss');
  h.sheet.fire('pointerdown', { clientX: 20, clientY: 20 });
  h.sheet.fire('click', { clientX: 20, clientY: 20 });
  await flushEvents();
  assert.equal(h.sheet.closeCalls, 1);
});

test('browsers without showModal retain real policy links without handlers or page locking', () => {
  const h = harness({ supportsDialog: false });
  assert.equal(h.opener.listeners.has('click'), false);
  assert.equal(h.opener.fire('click').event.defaultPrevented, false);
  assert.equal(h.opener.getAttribute('href'), 'polityka-prywatnosci.html');
  assert.equal(h.sheet.open, false);
  assert.equal(h.pageBody.classList.contains('privacy-open'), false);
});

test('mobile scroll locking restores both axes and preserves pre-existing inline styles', async () => {
  const h = harness({ reduced: true });
  h.window.scrollX = 12;
  h.pageBody.style.setProperty('--privacy-scroll-x', '2px', 'important');
  h.pageBody.style.setProperty('--privacy-scroll-y', '3px');
  h.document.documentElement.style.setProperty('scroll-behavior', 'smooth', 'important');
  h.opener.fire('click');
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-x'), '-12px');
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-y'), '-975px');
  // Fixing the body on mobile can reset the layout viewport's scroll offsets.
  h.window.scrollX = 0;
  h.window.scrollY = 0;
  h.returnButton.fire('click');
  await flushEvents();
  assert.equal(h.window.scrollX, 12);
  assert.equal(h.window.scrollY, 975);
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-x'), '2px');
  assert.equal(h.pageBody.style.getPropertyPriority('--privacy-scroll-x'), 'important');
  assert.equal(h.pageBody.style.getPropertyValue('--privacy-scroll-y'), '3px');
  assert.equal(h.document.documentElement.style.getPropertyValue('scroll-behavior'), 'smooth');
  assert.equal(h.document.documentElement.style.getPropertyPriority('scroll-behavior'), 'important');
  assert.equal(h.window.scrollCalls[0].rootBehavior, 'auto');
});

test('canceling a touch gesture on the backdrop does not close the dialog', () => {
  const h = harness({ reduced: true });
  h.opener.fire('click');
  h.sheet.fire('pointerdown', { clientX: 20, clientY: 20 });
  h.sheet.fire('pointercancel');
  h.sheet.fire('click', { clientX: 20, clientY: 20 });
  assert.equal(h.sheet.closeCalls, 0);
});

test('closing without animation APIs still restores focus and resumes the page at its top', async () => {
  const h = harness();
  h.window.scrollY = 0;
  delete h.sheet.animate;
  delete h.sheet.getAnimations;
  h.opener.fire('click');
  h.returnButton.fire('click');
  await flushEvents();
  assert.equal(h.pageBody.classList.contains('privacy-open'), false);
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.window.scrollY, 0);
  assert.deepEqual(h.window.events, ['scroll']);
});

test('an animated close cleans up its fill even when getAnimations is unavailable', async () => {
  const h = harness();
  delete h.sheet.getAnimations;
  h.opener.fire('click');
  h.returnButton.fire('click');
  h.sheet.animations[1].finish();
  await flushEvents();
  assert.ok(h.sheet.animations.every(animation => animation.canceled));
  h.secondOpener.fire('click');
  assert.equal(h.sheet.openCalls, 2);
  assert.equal(h.sheet.animations.length, 3);
});
