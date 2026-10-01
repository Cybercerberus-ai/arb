'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

function harness({ nativeDialog = true } = {}) {
  let document;
  function element() {
    const listeners = new Map(), attributes = new Map(), classes = new Set(), styles = new Map();
    return {
      dataset: {}, focusCalls: [],
      style: {
        getPropertyValue: name => styles.get(name)?.value ?? '',
        getPropertyPriority: name => styles.get(name)?.priority ?? '',
        setProperty: (name, value, priority = '') => styles.set(name, { value: String(value), priority }),
        removeProperty(name) { const value = styles.get(name)?.value ?? ''; styles.delete(name); return value; }
      },
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
        toggle(name, force) { const next = force ?? !classes.has(name); if (next) classes.add(name); else classes.delete(name); return next; }
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute: name => attributes.get(name) ?? null,
      hasAttribute: name => attributes.has(name),
      removeAttribute: name => attributes.delete(name),
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(callback);
      },
      fire(type, data = {}) {
        const event = { type, button: 0, currentTarget: this, target: this, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; }, ...data };
        for (const callback of listeners.get(type) || []) callback(event);
        return event;
      },
      focus(options) { document.activeElement = this; this.focusCalls.push(options); }
    };
  }
  const opener = element(), otherOpener = element(), closeButton = element(), dialog = element(), content = element();
  Object.defineProperty(dialog, 'open', {
    get() { return this.hasAttribute('open'); },
    set(value) { if (value) this.setAttribute('open', ''); else this.removeAttribute('open'); }
  });
  dialog.openCalls = 0;
  dialog.closeCalls = 0;
  dialog.querySelector = selector => selector === '[data-close-dialog]' ? closeButton : null;
  dialog.querySelectorAll = selector => selector === '[data-close-dialog]' ? [closeButton] : [];
  dialog.getBoundingClientRect = () => ({ left: 100, right: 740, top: 50, bottom: 600 });
  if (nativeDialog) {
    dialog.showModal = () => { dialog.open = true; dialog.openCalls++; };
    dialog.close = () => {
      if (!dialog.open) return;
      dialog.open = false;
      dialog.closeCalls++;
      queueMicrotask(() => dialog.fire('close'));
    };
  }
  const body = element(), root = element();
  document = {
    body, documentElement: root, activeElement: null,
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-open-company]' ? [opener, otherOpener] : [],
    getElementById: id => id === 'company-dialog' ? dialog : null,
    addEventListener() {}
  };
  const window = {
    scrollX: 0, scrollY: 1725, scrollCalls: [], events: [],
    matchMedia: () => ({ matches: false }), addEventListener() {},
    scrollTo(options) {
      this.scrollCalls.push({ ...options, rootBehavior: root.style.getPropertyValue('scroll-behavior') });
      this.scrollX = options.left;
      this.scrollY = options.top;
    },
    dispatchEvent(event) { this.events.push(event.type); return true; }
  };
  vm.runInNewContext(source, { window, document, Event }, { filename: 'app.js' });
  return { document, window, body, root, dialog, opener, otherOpener, closeButton, content };
}

const flushClose = () => new Promise(resolve => setImmediate(resolve));

test('company dialog locks the page and focuses its close control without scrolling', () => {
  const h = harness();
  const event = h.opener.fire('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.dialog.openCalls, 1);
  assert.equal(h.dialog.open, true);
  assert.equal(h.body.classList.contains('company-open'), true);
  assert.equal(h.body.style.getPropertyValue('--company-scroll-x'), '0px');
  assert.equal(h.body.style.getPropertyValue('--company-scroll-y'), '-1725px');
  assert.equal(h.document.activeElement, h.closeButton);
  assert.equal(h.closeButton.focusCalls.at(-1)?.preventScroll, true);
});

test('company close restores both scroll axes, existing styles and focus, then refreshes the background', async () => {
  const h = harness();
  h.window.scrollX = 16;
  h.body.style.setProperty('--company-scroll-x', '2px', 'important');
  h.body.style.setProperty('--company-scroll-y', '3px');
  h.root.style.setProperty('scroll-behavior', 'smooth', 'important');
  h.opener.fire('click');
  assert.equal(h.body.style.getPropertyValue('--company-scroll-x'), '-16px');
  // Fixed body positioning can reset the document viewport's scroll offsets.
  h.window.scrollX = 0;
  h.window.scrollY = 0;
  h.closeButton.fire('click');
  await flushClose();
  assert.equal(h.dialog.open, false);
  assert.equal(h.body.classList.contains('company-open'), false);
  assert.equal(h.window.scrollX, 16);
  assert.equal(h.window.scrollY, 1725);
  assert.equal(h.window.scrollCalls.length, 1);
  assert.equal(h.window.scrollCalls[0].behavior, 'auto');
  assert.equal(h.window.scrollCalls[0].rootBehavior, 'auto');
  assert.equal(h.body.style.getPropertyValue('--company-scroll-x'), '2px');
  assert.equal(h.body.style.getPropertyPriority('--company-scroll-x'), 'important');
  assert.equal(h.body.style.getPropertyValue('--company-scroll-y'), '3px');
  assert.equal(h.root.style.getPropertyValue('scroll-behavior'), 'smooth');
  assert.equal(h.root.style.getPropertyPriority('scroll-behavior'), 'important');
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.opener.focusCalls.at(-1)?.preventScroll, true);
  assert.deepEqual(h.window.events, ['resize', 'scroll']);
});

test('reopening an already open company dialog preserves its original position and opener', async () => {
  const h = harness();
  h.opener.fire('click');
  h.window.scrollY = 0;
  h.otherOpener.fire('click');
  assert.equal(h.dialog.openCalls, 1);
  assert.equal(h.body.style.getPropertyValue('--company-scroll-y'), '-1725px');
  // The native Escape path produces the same close event as dialog.close().
  h.dialog.close();
  await flushClose();
  assert.equal(h.window.scrollY, 1725);
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.body.style.getPropertyValue('--company-scroll-x'), '');
  assert.equal(h.body.style.getPropertyValue('--company-scroll-y'), '');
  assert.equal(h.root.style.getPropertyValue('scroll-behavior'), '');
  h.window.scrollY = 850;
  h.otherOpener.fire('click');
  assert.equal(h.dialog.openCalls, 2);
  h.closeButton.fire('click');
  await flushClose();
  assert.equal(h.window.scrollY, 850);
  assert.equal(h.document.activeElement, h.otherOpener);
});

test('company backdrop dismissal requires a gesture starting and ending outside the dialog', async () => {
  const h = harness();
  const inside = { clientX: 300, clientY: 250 }, outside = { clientX: 20, clientY: 20 };
  h.opener.fire('click');
  h.dialog.fire('pointerdown', { ...inside, target: h.content });
  h.dialog.fire('click', outside);
  assert.equal(h.dialog.open, true, 'Dragging selected text out of the dialog must not dismiss it');
  h.dialog.fire('pointerdown', outside);
  h.dialog.fire('click', inside);
  assert.equal(h.dialog.open, true, 'Ending a backdrop gesture inside the dialog must not dismiss it');
  h.dialog.fire('click', outside);
  assert.equal(h.dialog.open, true, 'The previous incomplete gesture must not arm a later click');
  h.dialog.fire('pointerdown', outside);
  h.dialog.fire('click', outside);
  await flushClose();
  assert.equal(h.dialog.closeCalls, 1);
  assert.equal(h.body.classList.contains('company-open'), false);
});

test('a canceled touch gesture does not dismiss company information', () => {
  const h = harness();
  h.opener.fire('click');
  h.dialog.fire('pointerdown', { clientX: 20, clientY: 20 });
  h.dialog.fire('pointercancel');
  h.dialog.fire('click', { clientX: 20, clientY: 20 });
  assert.equal(h.dialog.open, true);
  assert.equal(h.dialog.closeCalls, 0);
});

test('fallback without native dialog APIs can close by button and Escape without leaving a page lock', async () => {
  for (const exit of ['button', 'escape']) {
    const h = harness({ nativeDialog: false });
    h.opener.fire('click');
    assert.equal(h.dialog.open, true);
    assert.equal(h.dialog.getAttribute('role'), 'dialog');
    assert.equal(h.dialog.getAttribute('aria-modal'), 'true');
    assert.equal(h.body.classList.contains('company-open'), true);
    h.window.scrollY = 0;
    if (exit === 'button') h.closeButton.fire('click');
    else assert.equal(h.dialog.fire('keydown', { key: 'Escape' }).defaultPrevented, true);
    await flushClose();
    assert.equal(h.dialog.open, false);
    assert.equal(h.body.classList.contains('company-open'), false);
    assert.equal(h.window.scrollY, 1725);
    assert.equal(h.document.activeElement, h.opener);
    assert.equal(h.body.style.getPropertyValue('--company-scroll-y'), '');
    assert.deepEqual(h.window.events, ['resize', 'scroll']);
  }
});
