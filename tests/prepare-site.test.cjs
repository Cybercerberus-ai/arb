'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const child = require('node:child_process');
const generatorPath = path.resolve(__dirname, '../tools/prepare-site.cjs');
const { validateOrigin, PUBLIC_FILES, synchronizePrivacy } = require(generatorPath);
const workspace = fs.realpathSync(__dirname);
const temp = fs.mkdtempSync(path.join(workspace, 'prepare-site-test-'));
const source = path.join(temp, 'arb-carbon-technologies');
const output = path.join(temp, 'arb-carbon-technologies-public');
const origin = 'https://carbon-fixture.pl'; // Test fixture only; no network requests occur.
let checks = 0;
function check(name, run) {
  run();
  checks++;
  process.stdout.write(`OK ${name}\n`);
}
function hash(text) { return `'sha256-${crypto.createHash('sha256').update(text.replace(/\r\n?/g, '\n')).digest('base64')}'`; }
function scripts(html) { return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(item => item[1]); }
function fixture() {
  fs.mkdirSync(path.join(source, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(source, 'assets'));
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': '#organization', name: 'ARB', url: 'old', logo: 'old' },
    { '@type': 'WebSite', '@id': '#website', publisher: { '@id': '#organization' } },
    { '@type': 'WebPage', '@id': '#webpage', about: { '@id': '#service' } }
  ] };
  const privacy = { '@context': 'https://schema.org', '@type': 'WebPage', '@id': '#privacy', name: 'Prywatność' };
  const policy = `default-src 'self'; script-src 'self' ${hash(JSON.stringify(graph))} ${hash(JSON.stringify(privacy))}; script-src-elem 'self' ${hash(JSON.stringify(graph))}; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'`;
  for (const file of PUBLIC_FILES) fs.writeFileSync(path.join(source, file), 'fixture: ' + file);
  for (const [filename, data] of [['index.html', graph], ['polityka-prywatnosci.html', privacy]]) {
    fs.writeFileSync(path.join(source, filename), `<!doctype html>\r\n<html lang="pl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="canonical" href="old"><meta property="og:url" content="old"><meta property="og:image" content="old"><script type="application/ld+json">${JSON.stringify(data)}</script></head><body>Treść testowa.</body></html>\r\n`);
  }
  fs.writeFileSync(path.join(source, '_headers'), `/*\n  Content-Security-Policy: ${policy}; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n`);
  fs.writeFileSync(path.join(source, '.htaccess'), `<IfModule mod_headers.c>\nHeader always set Content-Security-Policy "${policy}; frame-ancestors 'none'"\nHeader always set X-Content-Type-Options "nosniff"\n</IfModule>\n`);
  fs.writeFileSync(path.join(source, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://old-fixture.pl/sitemap.xml\n');
  fs.writeFileSync(path.join(source, 'process-geometry.js'), 'unused');
  fs.writeFileSync(path.join(source, 'assets/old.png'), 'unused');
  fs.writeFileSync(path.join(source, 'README.md'), 'private build notes');
  fs.copyFileSync(generatorPath, path.join(source, 'tools/prepare-site.cjs'));
}
function cli(args) { return child.spawnSync(process.execPath, [path.join(source, 'tools/prepare-site.cjs'), ...args], { encoding: 'utf8', windowsHide: true }); }
function read(file) { return fs.readFileSync(path.join(output, file), 'utf8'); }

try {
  check('privacy sheet synchronizes from canonical policy with unique anchors', () => {
    const home = '<dialog id="privacy-sheet"><!-- privacy-content:start -->Old text<!-- privacy-content:end --></dialog>';
    const policy = '<p class="legal-date">Today</p><section id="cookies"><h2>Nowe zasady $&</h2><a href="#cookies">Spis</a></section><p><a href="index.html#zapytanie">Back</a></p>';
    const updated = synchronizePrivacy(home, policy);
    assert.ok(updated.includes('<h3>Nowe zasady $&</h3>'));
    assert.ok(updated.includes('id="sheet-cookies"'));
    assert.ok(updated.includes('href="#sheet-cookies"'));
    assert.ok(!updated.includes('Old text'));
    assert.ok(!updated.includes('>Back<'));
    assert.throws(() => synchronizePrivacy(home, '<p>Missing policy</p>'));
    assert.throws(() => synchronizePrivacy('<dialog id="privacy-sheet"></dialog>', policy));
    assert.equal(synchronizePrivacy('<body>No sheet</body>', policy), '<body>No sheet</body>');
  });
  check('public HTTPS origin normalization', () => {
    assert.equal(validateOrigin(origin + '/'), origin);
    assert.equal(validateOrigin('HTTPS://CARBON-FIXTURE.PL:443'), origin);
    assert.equal(validateOrigin('https://żółw.pl'), new URL('https://żółw.pl').origin);
  });
  check('local, IP, example, ambiguous and non-origin addresses rejected', () => {
    for (const value of [
      'http://carbon-fixture.pl', 'https://localhost', 'https://sub.localhost', 'https://127.0.0.1',
      'https://[::1]', 'https://[::ffff:127.0.0.1]', 'https://0x7f000001', 'https://2130706433',
      'https://example.com', 'https://www.example.net', 'https://example.co.uk', 'https://firma.example',
      'https://firma.test', 'https://firma.invalid', 'https://firma.local', 'https://real-domain.tld',
      'https://user:pass@carbon-fixture.pl', 'https://@carbon-fixture.pl', 'https://carbon-fixture.pl/a',
      'https://carbon-fixture.pl/../a', 'https://carbon-fixture.pl/?x=1', 'https://carbon-fixture.pl?',
      'https://carbon-fixture.pl/a/..', 'https://carbon-fixture.pl/.', 'https://carbon-fixture.pl/%2e',
      'https://carbon-fixture.pl#', 'https://carbon-fixture.pl/#a', 'https://carbon-fixture.pl\\a',
      'https://carbon-fixture.pl.', 'https://bad_label.pl', 'https://-bad.pl',
      'https://carbon-fixture.pl\n', ' https://carbon-fixture.pl', 'data:text/plain,abc', '', null
    ]) assert.throws(() => validateOrigin(value), undefined, String(value));
  });
  fixture();
  const originalIndex = fs.readFileSync(path.join(source, 'index.html'));
  check('--help does not mutate output or source', () => {
    const result = cli(['--help']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Nie publikuje strony/);
    assert.equal(fs.existsSync(output), false);
    assert.deepEqual(fs.readFileSync(path.join(source, 'index.html')), originalIndex);
  });
  check('CLI rejects an invalid URL without creating output', () => {
    const result = cli(['https://example.com']);
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(output), false);
  });
  check('CLI prepares an isolated allowlisted publication', () => {
    const result = cli([origin]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(output), true);
    for (const file of PUBLIC_FILES) assert.equal(fs.statSync(path.join(output, file)).isFile(), true, file);
    for (const file of ['tools', 'process-geometry.js', 'README.md', 'assets/old.png']) assert.equal(fs.existsSync(path.join(output, file)), false, file);
    assert.deepEqual(fs.readFileSync(path.join(source, 'index.html')), originalIndex);
  });
  check('canonical and sharing metadata correctly identify both pages', () => {
    for (const filename of ['index.html', 'polityka-prywatnosci.html']) {
      const html = read(filename);
      const url = `${origin}/${filename === 'index.html' ? '' : filename}`;
      assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
      assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1);
      assert.ok(html.includes(`<meta property="og:url" content="${url}">`));
      assert.ok(html.includes(`<meta property="og:image" content="${origin}/assets/carbon-hero.webp">`));
      assert.ok(html.includes(`<meta name="twitter:image" content="${origin}/assets/carbon-hero.webp">`));
      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
      assert.ok(!html.includes('content="old"'));
    }
  });
  check('all fragment IDs and organization/website URLs are absolute', () => {
    const graph = JSON.parse(scripts(read('index.html'))[0])['@graph'];
    assert.equal(graph[0]['@id'], origin + '/#organization');
    assert.equal(graph[0].url, origin + '/');
    assert.equal(graph[0].logo, origin + '/assets/arb-logo.webp');
    assert.equal(graph[1].url, origin + '/');
    assert.equal(graph[1].publisher['@id'], origin + '/#organization');
    assert.equal(graph[2].about['@id'], origin + '/#service');
    assert.equal(graph[2].url, origin + '/');
    const privacy = JSON.parse(scripts(read('polityka-prywatnosci.html'))[0]);
    assert.equal(privacy.url, origin + '/polityka-prywatnosci.html');
    assert.equal(privacy['@id'], origin + '/#privacy');
  });
  check('sitemap and robots contain exactly two canonical pages and no dates or anchors', () => {
    const sitemap = read('sitemap.xml');
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(item => item[1]);
    assert.deepEqual(urls, [origin + '/', origin + '/polityka-prywatnosci.html']);
    assert.ok(!sitemap.includes('<lastmod>'));
    assert.ok(!sitemap.includes('#'));
    assert.equal([...read('robots.txt').matchAll(/^Sitemap:.*$/gm)].length, 1);
    assert.ok(read('robots.txt').includes('Sitemap: ' + origin + '/sitemap.xml'));
    assert.ok(read('robots.txt').includes('Allow: /'));
  });
  check('all CSP locations contain the exact union of updated JSON-LD hashes', () => {
    const hashes = [...new Set([...scripts(read('index.html')), ...scripts(read('polityka-prywatnosci.html'))].map(hash))].sort();
    assert.equal(hashes.length, 2);
    for (const filename of ['index.html', 'polityka-prywatnosci.html', '_headers', '.htaccess']) {
      const content = read(filename);
      const actual = [...new Set(content.match(/'sha256-[A-Za-z0-9+/=]+'/g))].sort();
      assert.deepEqual(actual, hashes, filename);
      assert.ok(content.includes("connect-src 'none'"), filename);
      assert.ok(content.includes("form-action 'none'"), filename);
    }
    assert.ok(read('_headers').includes("frame-ancestors 'none'"));
    assert.ok(read('.htaccess').includes('X-Content-Type-Options "nosniff"'));
  });
  check('an existing output is refused and never overwritten', () => {
    const sentinel = path.join(output, 'keep-me.txt');
    fs.writeFileSync(sentinel, 'untouched');
    const result = cli([origin]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /już istnieje/);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'untouched');
  });
  check('invalid source CSP fails before creating any publication folder', () => {
    const area = path.join(temp, 'invalid-source');
    const invalidSource = path.join(area, 'arb-carbon-technologies');
    fs.cpSync(source, invalidSource, { recursive: true });
    fs.writeFileSync(path.join(invalidSource, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
    const result = child.spawnSync(process.execPath, [path.join(invalidSource, 'tools/prepare-site.cjs'), origin], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Brak nagłówka CSP/);
    assert.equal(fs.existsSync(path.join(area, 'arb-carbon-technologies-public')), false);
  });
  check('current site sources build correctly in a separate workspace fixture', () => {
    const area = path.join(temp, 'actual-source');
    const actualSource = path.join(area, 'arb-carbon-technologies');
    fs.mkdirSync(path.join(actualSource, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(actualSource, 'tools'));
    const realSource = path.resolve(__dirname, '..');
    for (const file of PUBLIC_FILES) fs.copyFileSync(path.join(realSource, file), path.join(actualSource, file));
    fs.copyFileSync(generatorPath, path.join(actualSource, 'tools/prepare-site.cjs'));
    const result = child.spawnSync(process.execPath, [path.join(actualSource, 'tools/prepare-site.cjs'), origin], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    const actualOutput = path.join(area, 'arb-carbon-technologies-public');
    const home = fs.readFileSync(path.join(actualOutput, 'index.html'), 'utf8');
    const privacy = fs.readFileSync(path.join(actualOutput, 'polityka-prywatnosci.html'), 'utf8');
    const expected = [...new Set([...scripts(home), ...scripts(privacy)].map(hash))].sort();
    assert.ok(expected.length > 0);
    for (const file of ['index.html', 'polityka-prywatnosci.html', '_headers', '.htaccess']) {
      const content = fs.readFileSync(path.join(actualOutput, file), 'utf8');
      assert.deepEqual([...new Set(content.match(/'sha256-[A-Za-z0-9+/=]+'/g))].sort(), expected, file);
    }
    assert.ok(home.includes(`href="${origin}/"`));
    assert.ok(privacy.includes(`href="${origin}/polityka-prywatnosci.html"`));
  });
  process.stdout.write(`Passed ${checks} checks.\n`);
  // Resolved absolute targets are checked before recursive cleanup on Windows.
  const resolvedTemp = fs.realpathSync(temp);
  assert.ok(resolvedTemp.startsWith(workspace + path.sep));
  assert.ok(path.basename(resolvedTemp).startsWith('prepare-site-test-'));
  fs.rmSync(resolvedTemp, { recursive: true });
} catch (error) {
  process.stderr.write(`FAIL after ${checks} checks: ${error.stack}\nFixture retained: ${temp}\n`);
  process.exitCode = 1;
}
