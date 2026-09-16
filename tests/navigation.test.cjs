'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function setup({ compact = true, legacyMedia = false, noMedia = false } = {}) {
  class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, handler, options = {}) {
      const listeners = this.listeners.get(type) || [];
      listeners.push({ handler, once: options.once });
      this.listeners.set(type, listeners);
    }
    dispatch(type, data = {}) {
      const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...data };
      for (const entry of [...(this.listeners.get(type) || [])]) {
        entry.handler(event);
        if (entry.once) this.listeners.set(type, this.listeners.get(type).filter(item => item !== entry));
      }
      return event;
    }
  }
  class Element extends Events {
    constructor(id) {
      super();
      this.id = id;
      this.attributes = new Map();
      this.children = [];
      this.dataset = {};
      this.focusCalls = [];
      const classes = new Set();
      this.classList = {
        add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value),
        toggle(value, enabled) { if (enabled ?? !classes.has(value)) classes.add(value); else classes.delete(value); }
      };
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    querySelectorAll(selector) { return selector === 'a[href]' ? this.children : []; }
    querySelector() { return null; }
    focus(options) {
      this.focusCalls.push(options);
      if (document.activeElement === this) return;
      const previous = document.activeElement;
      document.activeElement = this;
      previous?.dispatch('blur');
      document.dispatch('focusin', { target: this });
    }
  }
  const document = new Events();
  document.documentElement = new Element('html');
  document.body = new Element('body');
  document.activeElement = document.body;
  const header = new Element('site-header');
  const toggle = new Element('menu-toggle');
  toggle.setAttribute('aria-expanded', 'false');
  const navigation = new Element('primary-nav');
  const target = new Element('mozliwosci');
  const link = new Element('nav-link');
  link.setAttribute('href', '#mozliwosci');
  navigation.children.push(link);
  const outside = new Element('outside-button');
  const elements = new Map([header, toggle, navigation, target].map(element => [element.id, element]));
  document.querySelector = selector => elements.get(selector.slice(1)) || null;
  document.querySelectorAll = () => [];
  document.getElementById = id => elements.get(id) || null;
  const media = new Events();
  media.matches = compact;
  media.addListener = handler => Events.prototype.addEventListener.call(media, 'change', handler);
  if (legacyMedia) media.addEventListener = undefined;
  const window = new Events();
  window.innerWidth = compact ? 390 : 1280;
  window.scrollY = 0;
  if (!noMedia) window.matchMedia = query => query === '(max-width: 1024px)' ? media : { matches: false };
  window.scrollTo = () => assert.fail('Menu must leave scrolling to the native anchor navigation');
  target.scrollIntoView = window.scrollTo;
  vm.runInNewContext(source, { window, document, Date, Map, console }, { filename: 'app.js' });
  function click(element, data = {}) {
    const event = element.dispatch('click', { button: 0, ...data });
    document.dispatch('click', event);
    return event;
  }
  function setCompact(value) {
    media.matches = value;
    window.innerWidth = value ? 390 : 1280;
    if (noMedia) window.dispatch('resize');
    else media.dispatch('change');
  }
  const open = () => { click(toggle); assert.equal(toggle.getAttribute('aria-expanded'), 'true'); };
  const assertClosed = () => {
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(toggle.getAttribute('aria-label'), 'Otwórz menu');
    assert.equal(navigation.classList.contains('is-open'), false);
  };
  return { document, window, header, toggle, navigation, link, target, outside, click, setCompact, open, assertClosed };
}

test('menu button keeps its visual and accessible states synchronized', () => {
  const ui = setup();
  ui.open();
  assert.equal(ui.navigation.classList.contains('is-open'), true);
  assert.equal(ui.toggle.getAttribute('aria-label'), 'Zamknij menu');
  ui.click(ui.toggle);
  ui.assertClosed();
});

test('compact anchor focuses its section without a second scroll or blocked native navigation', () => {
  const ui = setup();
  ui.open();
  ui.link.focus();
  const event = ui.click(ui.link);
  ui.assertClosed();
  assert.equal(event.defaultPrevented, false);
  assert.equal(ui.document.activeElement, ui.target);
  assert.equal(ui.target.focusCalls[0].preventScroll, true);
  assert.equal(ui.target.getAttribute('tabindex'), '-1');
  ui.outside.focus();
  assert.equal(ui.target.hasAttribute('tabindex'), false);
});

test('existing target tabindex is preserved', () => {
  const ui = setup();
  ui.target.setAttribute('tabindex', '0');
  ui.open();
  ui.click(ui.link);
  ui.outside.focus();
  assert.equal(ui.target.getAttribute('tabindex'), '0');
});

test('desktop anchors preserve native focus behavior', () => {
  const ui = setup({ compact: false });
  ui.link.focus();
  const event = ui.click(ui.link);
  assert.equal(ui.document.activeElement, ui.link);
  assert.equal(ui.target.focusCalls.length, 0);
  assert.equal(event.defaultPrevented, false);
});

test('modified clicks and middle clicks preserve the open menu and native link behavior', () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const ui = setup();
    ui.open();
    ui.link.focus();
    const event = ui.click(ui.link, modifier);
    assert.equal(event.defaultPrevented, false);
    assert.equal(ui.toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(ui.document.activeElement, ui.link);
  }
});

test('Escape closes an open menu and restores focus without scrolling', () => {
  const ui = setup();
  ui.open();
  ui.link.focus();
  const event = ui.document.dispatch('keydown', { key: 'Escape' });
  ui.assertClosed();
  assert.equal(event.defaultPrevented, true);
  assert.equal(ui.document.activeElement, ui.toggle);
  assert.equal(ui.toggle.focusCalls.at(-1).preventScroll, true);
  assert.equal(ui.document.dispatch('keydown', { key: 'Escape' }).defaultPrevented, false);
});

test('outside click dismisses the menu and does not strand focus in hidden navigation', () => {
  const ui = setup();
  ui.open();
  ui.link.focus();
  ui.click(ui.navigation);
  assert.equal(ui.toggle.getAttribute('aria-expanded'), 'true');
  ui.click(ui.outside);
  ui.assertClosed();
  assert.equal(ui.document.activeElement, ui.toggle);
});

test('tabbing out dismisses the menu while retaining the newly focused control', () => {
  const ui = setup();
  ui.open();
  ui.link.focus();
  ui.outside.focus();
  ui.assertClosed();
  assert.equal(ui.document.activeElement, ui.outside);
});

test('crossing the layout breakpoint clears menu state and rescues hidden focus on compact layouts', () => {
  const ui = setup();
  ui.open();
  ui.link.focus();
  ui.setCompact(false);
  ui.assertClosed();
  assert.equal(ui.document.activeElement, ui.link);
  ui.setCompact(true);
  ui.assertClosed();
  assert.equal(ui.document.activeElement, ui.toggle);
});

test('legacy media-query listeners and resize fallback also close the menu', () => {
  for (const options of [{ legacyMedia: true }, { noMedia: true }]) {
    const ui = setup(options);
    ui.open();
    ui.setCompact(false);
    ui.assertClosed();
  }
});

test('missing or malformed anchor targets retain native navigation and never trap hidden focus', () => {
  for (const href of ['#missing', '#%invalid', 'https://example.com/']) {
    const ui = setup();
    ui.link.setAttribute('href', href);
    ui.open();
    ui.link.focus();
    assert.equal(ui.click(ui.link).defaultPrevented, false);
    ui.assertClosed();
    assert.equal(ui.document.activeElement, ui.toggle);
  }
});

test('fixed-body privacy overlay does not overwrite the scroll-dependent header state', () => {
  const ui = setup();
  ui.window.scrollY = 400;
  ui.window.dispatch('scroll');
  assert.equal(ui.header.classList.contains('is-scrolled'), true);
  ui.document.body.classList.add('privacy-open');
  ui.window.scrollY = 0;
  ui.window.dispatch('scroll');
  assert.equal(ui.header.classList.contains('is-scrolled'), true);
  ui.document.body.classList.remove('privacy-open');
  ui.window.dispatch('scroll');
  assert.equal(ui.header.classList.contains('is-scrolled'), false);
});
