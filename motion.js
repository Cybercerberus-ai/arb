(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const touchQuery = window.matchMedia('(pointer: coarse)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const hero = $('.hero');
  const heroCopy = $('.hero-content');
  const material = $('.material-feature');
  const laminate = $('.laminate-scene');
  const process = $('.process-grid');
  const values = new Map();
  const originalProperties = new Map();
  const visibility = new Map();
  const controllers = [];
  const activeAnimations = new Map();
  let enabled = false;
  let frame = 0;
  let previousTime = 0;
  let scrollDirty = true;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight || 1;

  function write(element, property, value) {
    if (!element) return;
    if (!originalProperties.has(element)) originalProperties.set(element, new Map());
    const originals = originalProperties.get(element);
    if (!originals.has(property)) originals.set(property, {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    });
    element.style.setProperty(property, value);
  }

  function restoreProperties() {
    originalProperties.forEach((properties, element) => properties.forEach((original, property) => {
      if (original.value) element.style.setProperty(property, original.value, original.priority);
      else element.style.removeProperty(property);
    }));
    originalProperties.clear();
    values.clear();
  }

  function schedule() {
    if (enabled && !document.hidden && !body.classList.contains('privacy-open') && !frame) frame = window.requestAnimationFrame(tick);
  }

  function target(element, property, destination, unit = '', owner = element, initial = 0) {
    if (!element) return;
    if (!values.has(element)) values.set(element, new Map());
    const properties = values.get(element);
    if (!properties.has(property)) properties.set(property, { current: initial, target: initial, unit, owner });
    properties.get(property).target = destination;
    if (owner && !visibility.has(owner)) visibility.set(owner, true);
  }

  function resetPointer(controller) {
    controller.pointer = null;
    controller.dirty = false;
    controller.element.classList.remove('is-tilting');
    const element = controller.element;
    if (controller.type === 'hero') {
      target(element, '--hero-x', 0, 'px');
      target(element, '--hero-y', 0, 'px');
      target(element, '--hero-ry', 0, 'deg');
      target(element, '--light-x', 64, '%', element, 64);
      target(element, '--light-y', 42, '%', element, 42);
    } else if (controller.type === 'card') {
      target(element, '--tilt-x', 0, 'deg');
      target(element, '--tilt-y', 0, 'deg');
      target(element, '--shine-x', 50, '%', element, 50);
      target(element, '--shine-y', 50, '%', element, 50);
    } else if (controller.type === 'laminate') {
      target(element, '--laminate-pointer-x', 0, 'deg');
      target(element, '--laminate-pointer-y', 0, 'deg');
    } else if (controller.type === 'button') {
      target(element, '--magnet-x', 0, 'px');
      target(element, '--magnet-y', 0, 'px');
    }
  }

  function addPointer(element, type) {
    if (!element) return;
    const controller = { element, type, pointer: null, dirty: false, bounds: null };
    controllers.push(controller);
    visibility.set(element, true);
    const move = event => {
      if (!enabled || document.hidden || !pointerQuery.matches || event.pointerType === 'touch') return;
      controller.pointer = { x: event.clientX, y: event.clientY };
      controller.dirty = true;
      schedule();
    };
    element.addEventListener('pointerenter', event => {
      controller.bounds = null;
      move(event);
    }, { passive: true });
    element.addEventListener('pointermove', move, { passive: true });
    const leave = () => {
      if (!enabled) return;
      resetPointer(controller);
      schedule();
    };
    element.addEventListener('pointerleave', leave, { passive: true });
    element.addEventListener('pointercancel', leave, { passive: true });
  }

  addPointer(hero, 'hero');
  addPointer(laminate, 'laminate');
  $$('.capability-card').forEach(element => addPointer(element, 'card'));
  $$('.button').forEach(element => addPointer(element, 'button'));

  function updatePointers() {
    controllers.forEach(controller => {
      if (!controller.dirty || !controller.pointer) return;
      controller.dirty = false;
      if (!pointerQuery.matches || visibility.get(controller.element) === false) return;
      const bounds = controller.bounds || (controller.bounds = controller.element.getBoundingClientRect());
      if (!bounds.width || !bounds.height) return;
      const x = clamp((controller.pointer.x - bounds.left) / bounds.width);
      const y = clamp((controller.pointer.y - bounds.top) / bounds.height);
      const centeredX = x * 2 - 1;
      const centeredY = y * 2 - 1;
      const element = controller.element;
      if (controller.type === 'hero') {
        target(element, '--hero-x', centeredX * 10, 'px');
        target(element, '--hero-y', centeredY * 7, 'px');
        target(element, '--hero-ry', centeredX * 1.1, 'deg');
        target(element, '--light-x', 20 + x * 60, '%', element, 64);
        target(element, '--light-y', 20 + y * 60, '%', element, 42);
      } else if (controller.type === 'card') {
        element.classList.add('is-tilting');
        target(element, '--tilt-x', -centeredY * 4, 'deg');
        target(element, '--tilt-y', centeredX * 6, 'deg');
        target(element, '--shine-x', x * 100, '%', element, 50);
        target(element, '--shine-y', y * 100, '%', element, 50);
      } else if (controller.type === 'laminate') {
        target(element, '--laminate-pointer-x', centeredX * 3, 'deg');
        target(element, '--laminate-pointer-y', -centeredY * 2, 'deg');
      } else if (controller.type === 'button') {
        target(element, '--magnet-x', centeredX * 3, 'px');
        target(element, '--magnet-y', centeredY * 3, 'px');
      }
    });
  }

  function updateScroll() {
    scrollDirty = false;
    if (body.classList.contains('privacy-open')) return;
    const height = viewportHeight;
    const travel = touchQuery.matches ? 0.35 : 1;
    const range = Math.max(0, root.scrollHeight - height);
    write(root, '--reading-progress', String(range ? clamp(window.scrollY / range) : 0));
    controllers.forEach(controller => {
      controller.bounds = null;
      if (controller.pointer) controller.dirty = true;
    });
    if (hero) {
      const bounds = hero.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < height;
      visibility.set(hero, visible);
      if (visible) {
        const progress = clamp(-bounds.top / Math.max(bounds.height, 1));
        target(hero, '--hero-scroll', progress * 65 * travel, 'px', hero);
        target(heroCopy, '--copy-y', progress * 30 * travel, 'px', hero);
      }
    }
    if (material && laminate) {
      const bounds = material.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < height;
      visibility.set(material, visible);
      if (visible) {
        const center = bounds.top + bounds.height / 2;
        const progress = clamp((height - center) / (height * 0.55));
        target(laminate, '--laminate-open', progress, '', material, 0.25);
        target(laminate, '--laminate-rotate', -26 + progress * 9, 'deg', material, -26);
        target(laminate, '--laminate-lift', -progress * 18, 'px', material);
      }
    }
    if (process) {
      const bounds = process.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < height;
      visibility.set(process, visible);
      if (visible) target(process, '--process-progress', clamp((height * 0.85 - bounds.top) / (height * 0.5)), '', process);
    }
  }

  function tick(time) {
    frame = 0;
    if (!enabled || document.hidden || body.classList.contains('privacy-open')) return;
    const elapsed = previousTime ? clamp(time - previousTime, 1, 48) : 16;
    previousTime = time;
    if (scrollDirty) updateScroll();
    updatePointers();
    const blend = 1 - Math.exp(-elapsed / 95);
    let moving = false;
    values.forEach((properties, element) => {
      properties.forEach((value, property) => {
        if (visibility.get(value.owner) === false || !element.isConnected) return;
        const delta = value.target - value.current;
        const threshold = value.unit ? 0.025 : 0.001;
        if (Math.abs(delta) > threshold) {
          value.current += delta * blend;
          moving = true;
        } else value.current = value.target;
        const formatted = `${Number(value.current.toFixed(4))}${value.unit}`;
        if (element.style.getPropertyValue(property) !== formatted) write(element, property, formatted);
      });
    });
    if (moving) schedule();
    else previousTime = 0;
  }

  function queueScroll() {
    if (body.classList.contains('privacy-open')) return;
    scrollDirty = true;
    schedule();
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', () => {
    // Browser bars and the onscreen keyboard must not move the page artwork.
    if (body.classList.contains('privacy-open')) return;
    if (touchQuery.matches && window.innerWidth === viewportWidth) return;
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight || 1;
    queueScroll();
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        visibility.set(entry.target, entry.isIntersecting);
        if (!entry.isIntersecting && enabled) {
          controllers.filter(controller => controller.element === entry.target).forEach(resetPointer);
        }
      });
      queueScroll();
    }, { threshold: 0 });
    new Set([hero, material, process, ...controllers.map(controller => controller.element)].filter(Boolean))
      .forEach(element => observer.observe(element));
  }

  function animate(element, keyframes, options = {}) {
    if (!enabled || document.hidden || !element || typeof element.animate !== 'function') return;
    activeAnimations.get(element)?.cancel();
    const animation = element.animate(keyframes, {
      duration: 350, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'backwards', ...options
    });
    activeAnimations.set(element, animation);
    const cleanup = () => {
      if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
    };
    animation.finished.then(cleanup, cleanup);
  }

  const sectorPanel = $('#sector-panel');
  if (sectorPanel && 'MutationObserver' in window) {
    let selectedTab = sectorPanel.getAttribute('aria-labelledby');
    new MutationObserver(() => {
      const nextTab = sectorPanel.getAttribute('aria-labelledby');
      if (nextTab === selectedTab) return;
      selectedTab = nextTab;
      [...sectorPanel.children].forEach((element, index) => animate(element, [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { delay: Math.min(index * 35, 105) }));
    }).observe(sectorPanel, { attributes: true, attributeFilter: ['aria-labelledby'] });
  }

  $$('details').forEach(details => details.addEventListener('toggle', () => {
    if (!details.open) return;
    details.querySelectorAll('p').forEach(paragraph => animate(paragraph, [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 280 }));
  }));

  if ('MutationObserver' in window) {
    $$('dialog:not(#privacy-sheet)').forEach(dialog => new MutationObserver(() => {
      if (dialog.open) animate(dialog, [
        { opacity: 0, transform: 'translateY(20px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 320 });
      else activeAnimations.get(dialog)?.cancel();
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  }

  function cancelAnimations() {
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
  }

  function setMotionPreference() {
    enabled = !reduceQuery.matches;
    body.classList.toggle('motion-ready', enabled);
    if (!enabled) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      cancelAnimations();
      controllers.forEach(controller => {
        controller.pointer = null;
        controller.dirty = false;
        controller.element.classList.remove('is-tilting');
      });
      restoreProperties();
      return;
    }
    controllers.forEach(resetPointer);
    ['.capability-cards', '.process-grid'].forEach(selector => {
      const group = $(selector);
      if (group) [...group.children].forEach((element, index) => write(element, '--reveal-delay', `${Math.min(index * 80, 240)}ms`));
    });
    queueScroll();
  }

  function listenToMedia(query, callback) {
    if (typeof query.addEventListener === 'function') query.addEventListener('change', callback);
    else query.addListener(callback);
  }
  listenToMedia(reduceQuery, setMotionPreference);
  listenToMedia(pointerQuery, () => {
    if (!enabled) return;
    controllers.forEach(resetPointer);
    schedule();
  });
  listenToMedia(touchQuery, queueScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      cancelAnimations();
      if (enabled) controllers.forEach(resetPointer);
    } else queueScroll();
  });
  window.addEventListener('blur', () => {
    if (enabled) {
      controllers.forEach(resetPointer);
      schedule();
    }
  });
  setMotionPreference();
})();
