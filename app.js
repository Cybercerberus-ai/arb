(() => {
  'use strict';
  const pageLocked = () => document.body.classList.contains('privacy-open') || document.body.classList.contains('company-open');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const metadata = document.documentElement.dataset;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function announce(element, message) {
    if (!element) return;
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.textContent = message;
  }

  $$('[data-current-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); });

  const header = $('#site-header');
  const updateHeader = () => {
    if (pageLocked()) return;
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const menuToggle = $('#menu-toggle');
  const navigation = $('#primary-nav');
  const compactMenu = window.matchMedia?.('(max-width: 1024px)');
  const isCompactMenu = () => compactMenu?.matches ?? window.innerWidth <= 1024;
  function closeMenu(restoreFocus = false) {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Otwórz menu');
    navigation?.classList.remove('is-open');
    if (restoreFocus) menuToggle?.focus({ preventScroll: true });
  }
  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      navigation.classList.toggle('is-open', open);
    });
    document.documentElement.classList.add('has-js-nav');
    $$('a[href]', navigation).forEach(link => link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const compact = isCompactMenu();
      closeMenu();
      if (!compact) return;
      const href = link.getAttribute('href');
      let target = null;
      try {
        if (href?.startsWith('#') && href.length > 1) target = document.getElementById(decodeURIComponent(href.slice(1)));
      } catch { /* A malformed fragment must not break the native link. */ }
      if (!target) {
        if (navigation.contains(document.activeElement)) menuToggle.focus({ preventScroll: true });
        return;
      }
      // Native anchor navigation performs the scroll and updates the URL once.
      // Move keyboard focus out of the menu before it becomes hidden.
      const temporaryTabIndex = !target.hasAttribute('tabindex');
      if (temporaryTabIndex) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        closeMenu(true);
      }
    });
    const outsideMenu = target => !navigation.contains(target) && !menuToggle.contains(target);
    document.addEventListener('click', event => {
      if (menuToggle.getAttribute('aria-expanded') === 'true' && outsideMenu(event.target)) {
        closeMenu(navigation.contains(document.activeElement));
      }
    });
    document.addEventListener('focusin', event => {
      if (menuToggle.getAttribute('aria-expanded') === 'true' && outsideMenu(event.target)) closeMenu();
    });
    const updateMenuLayout = () => closeMenu(isCompactMenu() && navigation.contains(document.activeElement));
    if (compactMenu?.addEventListener) compactMenu.addEventListener('change', updateMenuLayout);
    else if (compactMenu?.addListener) compactMenu.addListener(updateMenuLayout);
    else window.addEventListener('resize', updateMenuLayout, { passive: true });
  }

  const navLinks = $$('[data-nav-link]');
  const sections = ['o-nas', 'mozliwosci', 'wspolpraca', 'kontakt']
    .map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const visibleSections = new Map();
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry.intersectionRatio);
        else visibleSections.delete(entry.target.id);
      });
      const active = [...visibleSections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      navLinks.forEach(link => {
        const selected = link.getAttribute('href') === `#${active}`;
        link.classList.toggle('is-active', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -45% 0px', threshold: [0, 0.1, 0.3, 0.6, 1] });
    sections.forEach(section => sectionObserver.observe(section));
  }

  const revealElements = $$('[data-reveal]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('is-visible'));
  } else {
    try {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px 32px 0px' });
      document.body.classList.add('js-ready');
      revealElements.forEach(element => revealObserver.observe(element));
    } catch {
      document.body.classList.remove('js-ready');
      revealElements.forEach(element => element.classList.add('is-visible'));
    }
  }

  const sectorPanels = $$('[data-sector-panel]');
  const sectorTabs = $$('[data-sector]').filter(element => element.matches('button, [role="tab"]'));
  function selectSector(tab, moveFocus = false) {
    const key = tab.dataset.sector;
    if (!sectorPanels.some(panel => panel.dataset.sectorPanel === key)) return;
    sectorTabs.forEach(element => {
      const selected = element === tab;
      element.setAttribute('aria-selected', String(selected));
      element.tabIndex = selected ? 0 : -1;
      element.classList.toggle('is-active', selected);
    });
    sectorPanels.forEach(panel => {
      const selected = panel.dataset.sectorPanel === key;
      panel.hidden = !selected;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + panel.dataset.sectorPanel);
    });
    document.dispatchEvent(new CustomEvent('arb:sectorchange', { detail: { panel: document.getElementById(tab.getAttribute('aria-controls')) } }));
    if (moveFocus) tab.focus();
  }
  sectorTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSector(tab));
    tab.addEventListener('keydown', event => {
      let nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % sectorTabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + sectorTabs.length) % sectorTabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = sectorTabs.length - 1;
      else return;
      event.preventDefault();
      selectSector(sectorTabs[nextIndex], true);
    });
  });
  const initiallySelected = sectorTabs.find(tab => tab.getAttribute('aria-selected') === 'true') || sectorTabs[0];
  if (initiallySelected) {
    selectSector(initiallySelected);
    $('.sector-tabs').hidden = false;
  }

  const form = $('#project-form');
  const formStatus = $('#form-status');
  const field = name => form?.elements.namedItem(name) || (form ? $(`#${name}, #project-${name}`, form) : null);
  // A sector's project link carries that choice into the brief on every screen.
  $$('[data-project-sector]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const sector = field('sector');
    if (sector && [...sector.options].some(option => option.value === link.dataset.projectSector)) {
      sector.value = link.dataset.projectSector;
      sector.setCustomValidity('');
      sector.removeAttribute('aria-invalid');
    }
  }));
  const messageField = field('message');
  const messageCount = $('#message-count');
  function updateMessageCount() {
    if (messageField && messageCount) messageCount.textContent = `${messageField.value.length} / 2500`;
  }
  messageField?.addEventListener('input', updateMessageCount);
  updateMessageCount();

  const guard = window.ARBBriefGuard;
  const submitButton = $('#prepare-inquiry');
  const briefFields = $('#brief-fields');
  let sending = false, lastPayload = '', requestId = '';
  if (form && guard) {
    form.noValidate = true;
    $$('input, textarea, select', form).forEach(input => {
      const clear = () => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); };
      input.addEventListener('input', clear); input.addEventListener('change', clear);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending) return;
      const names = ['name','quantity','company','sector','message','contactName','email','phone'];
      const result = guard.validate(Object.fromEntries(names.map(name => [name, field(name)?.value || ''])));
      names.forEach(name => {
        const input = field(name); if (!input) return;
        input.setCustomValidity(result.errors[name] || '');
        if (result.errors[name]) input.setAttribute('aria-invalid','true'); else input.removeAttribute('aria-invalid');
      });
      if (!result.ok || !form.reportValidity()) {
        form.reportValidity(); announce(formStatus,'Sprawdź zaznaczone pola. Zapytanie nie zostało wysłane.'); return;
      }
      const payload = {...result.values, website: field('website')?.value || ''};
      const serialized = JSON.stringify(payload);
      if (serialized !== lastPayload || !requestId) { requestId = window.crypto.randomUUID(); lastPayload = serialized; }
      sending = true; briefFields.disabled = true;
      submitButton?.setAttribute('aria-busy','true');
      announce(formStatus,'Wysyłanie zapytania…');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await window.fetch('inquiry.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...payload,requestId}), signal:controller.signal, credentials:'omit'});
        const data = await response.json();
        if (!response.ok || data.ok !== true) throw new Error(data.message || 'Serwer nie przyjął zapytania.');
        announce(formStatus,data.message);
      } catch (error) {
        const detail = error.name === 'AbortError' ? 'Przekroczono czas oczekiwania. Nie udało się potwierdzić wysyłki.' : error.message;
        announce(formStatus, detail + ' Dane pozostają w formularzu. Możesz spróbować ponownie lub napisać na kontakt@arbcarbon.pl.');
      } finally {
        clearTimeout(timeout); sending = false; briefFields.disabled = false;
        submitButton?.removeAttribute('aria-busy');
      }
    });
    form.addEventListener('reset', event => {
      if (sending) { event.preventDefault(); return; }
      $$('input, textarea, select', form).forEach(input => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); });
      lastPayload = ''; requestId = '';
      setTimeout(() => { updateMessageCount(); announce(formStatus,'Pola formularza zostały wyczyszczone.'); },0);
    });
    briefFields.disabled = false;
  }

  function setupDialog(id, triggerSelector) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    let opener = null, savedPosition = null, outsideDown = false;
    const offsetNames = ['--company-scroll-x', '--company-scroll-y'];
    const lockPage = () => {
      savedPosition = {
        x: window.scrollX, y: window.scrollY,
        offsets: offsetNames.map(name => ({ value: document.body.style.getPropertyValue(name), priority: document.body.style.getPropertyPriority(name) }))
      };
      document.body.style.setProperty(offsetNames[0], `${-savedPosition.x}px`);
      document.body.style.setProperty(offsetNames[1], `${-savedPosition.y}px`);
      document.body.classList.add('company-open');
    };
    const restorePage = () => {
      if (!savedPosition) return;
      const rootStyle = document.documentElement.style;
      const behavior = rootStyle.getPropertyValue('scroll-behavior');
      const priority = rootStyle.getPropertyPriority('scroll-behavior');
      rootStyle.setProperty('scroll-behavior', 'auto', 'important');
      document.body.classList.remove('company-open');
      offsetNames.forEach((name, index) => {
        const saved = savedPosition.offsets[index];
        if (saved.value) document.body.style.setProperty(name, saved.value, saved.priority);
        else document.body.style.removeProperty(name);
      });
      window.scrollTo({ left: savedPosition.x, top: savedPosition.y, behavior: 'auto' });
      if (behavior) rootStyle.setProperty('scroll-behavior', behavior, priority);
      else rootStyle.removeProperty('scroll-behavior');
      savedPosition = null;
      // The viewport can change while the background effects are paused.
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    };
    const finishClose = () => {
      restorePage();
      outsideDown = false;
      opener?.focus?.({ preventScroll: true });
      opener = null;
    };
    const close = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else { dialog.removeAttribute('open'); finishClose(); }
    };
    $$(triggerSelector).forEach(trigger => trigger.addEventListener('click', event => {
      event.preventDefault();
      if (dialog.open || dialog.hasAttribute('open')) return;
      opener = trigger;
      lockPage();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {
        dialog.setAttribute('open', '');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
      }
      dialog.scrollTop = 0;
      $('[data-close-dialog]', dialog)?.focus({ preventScroll: true });
    }));
    $$('[data-close-dialog]', dialog).forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('close', finishClose);
    const outside = event => {
      const bounds = dialog.getBoundingClientRect();
      return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    };
    dialog.addEventListener('pointerdown', event => { outsideDown = event.target === dialog && outside(event); });
    dialog.addEventListener('pointercancel', () => { outsideDown = false; });
    dialog.addEventListener('click', event => {
      if (outsideDown && event.target === dialog && outside(event)) close();
      outsideDown = false;
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && typeof dialog.close !== 'function') {
        event.preventDefault();
        close();
      }
    });
  }
  setupDialog('company-dialog', '[data-open-company]');

  function vcardEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  $$('[data-download-vcard]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const fullName = metadata.companyName || 'ARB Carbon Technologies';
    const street = metadata.companyStreet || '';
    const city = metadata.companyCity || '';
    const postcode = metadata.companyPostcode || '';
    const country = metadata.companyCountry || '';
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vcardEscape(fullName)}`, `N:${vcardEscape(fullName)};;;;`, `ORG:${vcardEscape(fullName)}`];
    if (street || city || postcode || country) lines.push(`ADR;TYPE=WORK:;;${vcardEscape(street)};${vcardEscape(city)};;${vcardEscape(postcode)};${vcardEscape(country)}`);
    if (metadata.companyEmail) lines.push(`EMAIL;TYPE=INTERNET,WORK:${vcardEscape(metadata.companyEmail)}`);
    if (metadata.companyPhone) lines.push(`TEL;TYPE=WORK,VOICE:${vcardEscape(metadata.companyPhone)}`);
    if (metadata.companyKrs) lines.push(`NOTE:${vcardEscape(`KRS: ${metadata.companyKrs}`)}`);
    lines.push('END:VCARD');
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arb-carbon-technologies.vcf';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }));
})();

