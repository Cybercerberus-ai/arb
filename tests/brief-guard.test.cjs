'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const guardPath = path.resolve(__dirname, '../brief-guard.js');
const guard = require(guardPath);
const valid = {
  name: 'Osłona urządzenia', quantity: '12', company: 'Łódź Technologie',
  sector: 'Przemysł', message: 'Proszę o lekką osłonę. Wymiary: 200 × 350 mm.'
};
let assertions = 0;
let failures = 0;
function check(name, test) {
  assertions++;
  try {
    test();
    process.stdout.write(`OK ${name}\n`);
  } catch (error) {
    failures++;
    process.stderr.write(`FAIL ${name}: ${error.message}\n`);
  }
}
const validate = change => guard.validate({ ...valid, ...change });

check('valid Polish text and integer normalization', () => {
  const result = validate({});
  assert.equal(result.ok, true);
  assert.equal(result.values.quantity, 12);
  assert.equal(result.values.company, valid.company);
  assert.deepEqual(result.errors, {});
});
check('NFC and outer whitespace normalization', () => {
  const result = validate({ name: '  c\u0301ma — osłona  ', company: '   ', quantity: ' 0012 ' });
  assert.equal(result.ok, true);
  assert.equal(result.values.name, 'ćma — osłona');
  assert.equal(result.values.company, '');
  assert.equal(result.values.quantity, 12);
});
check('upper boundaries remain valid', () => {
  assert.equal(validate({ name: 'a'.repeat(100), company: 'b'.repeat(120), message: 'c'.repeat(2500), quantity: '100000' }).ok, true);
});
check('minimum boundaries remain valid', () => {
  assert.equal(validate({ name: 'A', message: 'm'.repeat(20), quantity: '1' }).ok, true);
});
check('overlong company is rejected explicitly', () => {
  assert.ok(validate({ company: 'a'.repeat(121) }).errors.company);
});
check('name and message length violations', () => {
  assert.ok(validate({ name: 'a'.repeat(101) }).errors.name);
  assert.ok(validate({ message: 'a'.repeat(19) }).errors.message);
  assert.ok(validate({ message: 'a'.repeat(2501) }).errors.message);
});
check('all company sector choices match the public form', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const select = html.match(/<select\b[^>]*\bname="sector"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(select, 'Missing sector select');
  const options = [...select[1].matchAll(/<option\b[^>]*\bvalue="([^"]*)"/g)].map(item => item[1]);
  assert.deepEqual(guard.sectors, options);
  for (const sector of options) assert.equal(validate({ sector }).ok, true);
});
check('sector spoof and prototype names are rejected', () => {
  for (const sector of ['__proto__', 'constructor', 'Nowy sektor', 'Prze\u200bmysł', '<script>']) {
    assert.ok(validate({ sector }).errors.sector, sector);
  }
});
check('scientific, special and non-decimal quantity strings are rejected', () => {
  for (const quantity of ['Infinity', 'NaN', '1e2', '2E3', '0x10', '0b10', '2.0', '2,0', '+2', '-2', '1 000', '1\u200b0', '１２', '']) {
    const result = validate({ quantity });
    assert.ok(result.errors.quantity, JSON.stringify(quantity));
    assert.equal(result.values.quantity, null);
  }
});
check('quantity bounds and unsafe integers are rejected', () => {
  for (const quantity of ['0', '100001', '9007199254740993', '9'.repeat(500), Infinity, NaN, {}, []]) {
    assert.ok(validate({ quantity }).errors.quantity);
  }
});
check('already parsed integer is supported without coercing objects', () => {
  assert.equal(validate({ quantity: 12 }).values.quantity, 12);
  assert.ok(validate({ quantity: 1.2 }).errors.quantity);
});
check('control-only mandatory fields cannot satisfy validation', () => {
  const result = validate({ name: ' \u0000\u202e\u2066\u200b ', message: '\u0000'.repeat(30) });
  assert.ok(result.errors.name);
  assert.ok(result.errors.message);
});
check('controls removed, multiline CRLF normalized, tabs retained', () => {
  const result = validate({
    name: 'Osłona\u0000\u202e\u2066', company: 'ARB\r\n\u200f',
    message: 'Pierwsza linia\r\nDruga\tlinia\rTrzecia linia\u0000\u202e'
  });
  assert.equal(result.ok, true);
  assert.equal(result.values.name, 'Osłona');
  assert.equal(result.values.company, 'ARB');
  assert.equal(result.values.message, 'Pierwsza linia\nDruga\tlinia\nTrzecia linia');
});
check('HTML-like text, apostrophes and links remain safe plain TXT', () => {
  const message = '<script>alert("x")</script> Wymiar < 100 mm. O\'Brien: https://example.org/model?x=1&y=2';
  const result = validate({ message });
  assert.equal(result.ok, true);
  assert.equal(result.values.message, message);
});
check('malformed input returns useful field errors without exceptions', () => {
  for (const input of [null, undefined, '', [], { name: {}, company: {}, message: [], sector: {}, quantity: true }]) {
    const result = guard.validate(input);
    assert.equal(result.ok, false);
    assert.ok(result.errors.name);
    assert.ok(result.errors.quantity);
    assert.ok(result.errors.message);
    assert.ok(result.errors.sector);
  }
});
check('input object remains unchanged', () => {
  const source = Object.freeze({ ...valid, name: '  Osłona  ' });
  const result = guard.validate(source);
  assert.equal(source.name, '  Osłona  ');
  assert.equal(result.values.name, 'Osłona');
});
check('browser global works without DOM, cookies, storage or clocks', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(guardPath, 'utf8'), context);
  assert.equal(typeof context.ARBBriefGuard.validate, 'function');
  assert.equal(context.ARBBriefGuard.validate(valid).ok, true);
});

process.stdout.write(`Passed ${assertions - failures}/${assertions} checks.\n`);
if (failures) process.exitCode = 1;
