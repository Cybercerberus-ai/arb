/* Local TXT validation. A future receiving server must validate independently. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ARBBriefGuard = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const sectors = Object.freeze([
    'Projekt indywidualny', 'Przemysł', 'Motoryzacja', 'Lotnictwo', 'Inne zastosowanie'
  ]);
  const limits = Object.freeze({ name: 100, company: 120, messageMin: 20, messageMax: 2500, quantityMax: 100000 });
  const invisible = /[\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
  const lineControls = /[\u0000-\u001f]/g;
  const textControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

  function normalize(value, multiline) {
    if (typeof value !== 'string') return '';
    return value.normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(multiline ? textControls : lineControls, '')
      .replace(invisible, '')
      .trim();
  }

  /**
   * Returns normalized strings, quantity as an integer (or null), and field errors.
   * No HTML is interpreted: angle brackets, quotes and documentation URLs remain TXT.
   * Quantity accepts a decimal digit string or an already parsed integer only.
   */
  function validate(payload) {
    const input = payload && typeof payload === 'object' ? payload : {};
    const name = normalize(input.name, false);
    const company = normalize(input.company, false);
    const message = normalize(input.message, true);
    // Do not silently strip characters from a discrete choice or a number.
    const sector = typeof input.sector === 'string' ? input.sector.normalize('NFC').trim() : '';
    const rawQuantity = typeof input.quantity === 'string' ? input.quantity.trim()
      : typeof input.quantity === 'number' && Number.isInteger(input.quantity) ? String(input.quantity) : '';
    const parsedQuantity = /^[0-9]+$/.test(rawQuantity) ? Number(rawQuantity) : NaN;
    const validQuantity = Number.isSafeInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= limits.quantityMax;
    const values = { name, quantity: validQuantity ? parsedQuantity : null, company, sector, message };
    const errors = {};

    if (!name) errors.name = 'Podaj nazwę projektu.';
    else if (name.length > limits.name) errors.name = 'Nazwa projektu może mieć najwyżej 100 znaków.';
    if (company.length > limits.company) errors.company = 'Nazwa firmy może mieć najwyżej 120 znaków.';
    else if (input.company != null && typeof input.company !== 'string') errors.company = 'Wpisz nazwę firmy jako tekst lub pozostaw pole puste.';
    if (!validQuantity) errors.quantity = 'Podaj pełną liczbę sztuk od 1 do 100 000, używając wyłącznie cyfr.';
    if (!sectors.includes(sector)) errors.sector = 'Wybierz obszar projektu z dostępnej listy.';
    if (message.length < limits.messageMin) errors.message = 'Opisz projekt, używając co najmniej 20 znaków.';
    else if (message.length > limits.messageMax) errors.message = 'Opis projektu może mieć najwyżej 2500 znaków.';

    return { ok: Object.keys(errors).length === 0, values, errors };
  }

  return Object.freeze({ validate, sectors, limits });
});
