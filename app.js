(() => {
  'use strict';

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
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const menuToggle = $('#menu-toggle');
  const navigation = $('#primary-nav');
  function closeMenu() {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Otwórz menu');
    navigation?.classList.remove('is-open');
  }
  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      navigation.classList.toggle('is-open', open);
    });
    document.documentElement.classList.add('has-js-nav');
    $$('a[href]', navigation).forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuToggle.focus();
      }
    });
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
  const messageField = field('message');
  const messageCount = $('#message-count');
  function updateMessageCount() {
    if (messageField && messageCount) messageCount.textContent = `${messageField.value.length} / 2500`;
  }
  messageField?.addEventListener('input', updateMessageCount);
  updateMessageCount();

  function downloadText(content, filename, type = 'text/plain;charset=utf-8') {
    const blob = new Blob(['\uFEFF', content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // No endpoint: validation and the cooldown protect local file preparation only.
  // A future sending service must perform its own server-side anti-abuse checks.
  const guard = window.ARBBriefGuard;
  const submitButton = $('#prepare-inquiry');
  let lastPreparedAt = -Infinity;
  let cooldownTimer = 0;
  const briefFields = $('#brief-fields');
  if (form && guard) {
    form.noValidate = true;
    $$('input, textarea, select', form).forEach(input => {
      const clearError = () => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); };
      input.addEventListener('input', clearError);
      input.addEventListener('change', clearError);
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (performance.now() - lastPreparedAt < 3000) {
        announce(formStatus, 'Plik został już przygotowany. Odczekaj chwilę przed kolejnym pobraniem.');
        return;
      }
      const names = ['name', 'quantity', 'company', 'sector', 'message'];
      const result = guard.validate(Object.fromEntries(names.map(name => [name, field(name)?.value || ''])));
      names.forEach(name => {
        const input = field(name);
        if (!input) return;
        input.setCustomValidity(result.errors[name] || '');
        if (result.errors[name]) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
      if (!result.ok || !form.reportValidity()) {
        form.reportValidity();
        announce(formStatus, 'Sprawdź zaznaczone pola. Opis nie został pobrany ani wysłany.');
        return;
      }
      names.forEach(name => { if (field(name)) field(name).value = String(result.values[name]); });
      updateMessageCount();
      const { name, quantity, company, sector, message } = result.values;
      const body = [
        'ARB CARBON TECHNOLOGIES', 'OPIS PROJEKTU', '',
        'Data przygotowania: ' + new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(new Date()),
        'Nazwa projektu: ' + name,
        'Planowana liczba sztuk: ' + quantity,
        ...(company ? ['Firma: ' + company] : []),
        'Obszar projektu: ' + sector,
        '', 'Opis projektu:', message, '',
        'Dokument został przygotowany lokalnie w przeglądarce. Dane nie zostały wysłane do firmy ani na serwer.'
      ].join('\r\n');
      try {
        downloadText(body, 'ARB-opis-projektu.txt');
        lastPreparedAt = performance.now();
        submitButton?.setAttribute('aria-disabled', 'true');
        clearTimeout(cooldownTimer);
        cooldownTimer = setTimeout(() => submitButton?.removeAttribute('aria-disabled'), 3000);
        announce(formStatus, 'Opis projektu jest gotowy do pobrania. Nic nie zostało wysłane. Pola możesz usunąć przyciskiem „Wyczyść opis”.');
      } catch {
        announce(formStatus, 'Nie udało się przygotować pobierania. Skopiuj opis z formularza. Nic nie zostało wysłane.');
      }
    });
    form.addEventListener('reset', () => {
      $$('input, textarea, select', form).forEach(input => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); });
      setTimeout(() => {
        updateMessageCount();
        announce(formStatus, 'Pola formularza zostały wyczyszczone. Pobrany wcześniej plik pozostaje na Twoim urządzeniu.');
      }, 0);
    });
    // A failed/missing guard leaves the fieldset disabled instead of falling back to a network submit.
    if (briefFields) briefFields.disabled = false;
  }

  function setupDialog(id, triggerSelector) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    let opener = null;
    const restoreFocus = () => {
      opener?.focus?.({ preventScroll: true });
      opener = null;
    };
    const close = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else { dialog.removeAttribute('open'); restoreFocus(); }
    };
    $$(triggerSelector).forEach(trigger => trigger.addEventListener('click', event => {
      event.preventDefault();
      opener = trigger;
      if (dialog.open) return;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {
        dialog.setAttribute('open', '');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
      }
      $('[data-close-dialog]', dialog)?.focus();
    }));
    $$('[data-close-dialog]', dialog).forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('close', restoreFocus);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
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
