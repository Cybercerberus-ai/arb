#!/usr/bin/env node
'use strict';

// Prepare a local publication folder. This script never deploys or sends data.
// Before publication, align hosting/log-retention details in the privacy policy
// with the actual hosting service; generating metadata does not establish them.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');

const PUBLIC_FILES = Object.freeze([
  'index.html', 'polityka-prywatnosci.html',
  'styles.css', 'motion.css', 'space.css', 'mist.css', 'cards.css', 'enhancements.css', 'privacy.css', 'mobile.css',
  'app.js', 'brief-guard.js', 'motion.js', 'space-flow.js', 'space-scene.js', 'mist.js', 'privacy.js',
  'robots.txt', '_headers', '.htaccess',
  'assets/arb-logo.webp', 'assets/carbon-hero.webp', 'assets/favicon.svg'
]);
const HTML_FILES = ['index.html', 'polityka-prywatnosci.html'];
const OUTPUT_NAME = 'arb-carbon-technologies-public';
const HELP = [
  'Przygotowanie strony ARB dla domeny publicznej', '',
  'Użycie: node tools/prepare-site.cjs <domena HTTPS>',
  '        node tools/prepare-site.cjs --help', '',
  'Podaj sam origin HTTPS własnej domeny, bez loginu, ścieżki, zapytania i fragmentu.',
  'Narzędzie odrzuca adresy lokalne, IP oraz domeny przykładowe.',
  'Tworzy sąsiedni folder arb-carbon-technologies-public; nie nadpisuje istniejącego.',
  'Ustawia canonical, metadane udostępniania, JSON-LD, sitemap i hashe CSP.',
  'Kopiuje wyłącznie pliki publiczne. Nie publikuje strony ani nie sprawdza własności domeny.',
  'Przed publikacją dopasuj informacje o hostingu i logach w polityce prywatności.'
].join('\n');

function validateOrigin(value) {
  if (typeof value !== 'string' || !value || /[\s\\?#]/u.test(value)) {
    throw new Error('Podaj wyłącznie origin HTTPS, bez spacji, ścieżki, zapytania i fragmentu.');
  }
  let url;
  try { url = new URL(value); } catch { throw new Error('Niepoprawny adres domeny HTTPS.'); }
  // Check the raw shape too: URL normalizes paths such as /a/.. into /.
  const authority = value.match(/^https:\/\/([^/]+)\/?$/i)?.[1] || '';
  if (url.protocol !== 'https:' || !authority || authority.includes('@') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Adres musi być originem HTTPS bez danych logowania ani dodatkowej ścieżki.');
  }
  const hostname = url.hostname.toLowerCase();
  const bareHost = hostname.replace(/^\[|\]$/g, '');
  const labels = hostname.split('.');
  const reservedSuffixes = ['localhost', 'local', 'internal', 'lan', 'home', 'example', 'test', 'invalid', 'tld', 'onion'];
  if (net.isIP(bareHost) || hostname.endsWith('.') || labels.length < 2 || hostname.length > 253 ||
      labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
      labels.includes('example') || labels.includes('localhost') || reservedSuffixes.includes(labels.at(-1))) {
    throw new Error('Wymagana jest publiczna domena; adresy IP, lokalne i przykładowe są niedozwolone.');
  }
  return url.origin;
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeAttribute(value) {
  return value.replace(/&quot;/gi, '"').replace(/&#(?:39|x27);|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp('(?:\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return match ? decodeAttribute(match[1] ?? match[2] ?? match[3]) : null;
}

function addHeadTag(html, tag) {
  if (!/<\/head\s*>/i.test(html)) throw new Error('Brak zamknięcia head w dokumencie HTML.');
  return html.replace(/<\/head\s*>/i, `  ${tag}\n</head>`);
}

function setMeta(html, key, value, kind = 'property') {
  let found = false;
  const replacement = `<meta ${kind}="${key}" content="${escapeAttribute(value)}">`;
  html = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (attribute(tag, kind)?.toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    return replacement;
  });
  return found ? html : addHeadTag(html, replacement);
}

function setCanonical(html, url) {
  let found = false;
  const replacement = `<link rel="canonical" href="${escapeAttribute(url)}">`;
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    if (!(attribute(tag, 'rel') || '').toLowerCase().split(/\s+/).includes('canonical')) return tag;
    if (found) return '';
    found = true;
    return replacement;
  });
  return found ? html : addHeadTag(html, replacement);
}

function visitStructuredData(node, origin, canonical) {
  if (Array.isArray(node)) return node.map(item => visitStructuredData(item, origin, canonical));
  if (!node || typeof node !== 'object') return node;
  const result = Object.fromEntries(Object.entries(node).map(([key, value]) => [key, visitStructuredData(value, origin, canonical)]));
  if (typeof result['@id'] === 'string' && result['@id'].startsWith('#')) result['@id'] = `${origin}/${result['@id']}`;
  const types = Array.isArray(result['@type']) ? result['@type'] : [result['@type']];
  if (types.includes('Organization')) {
    result.url = `${origin}/`;
    result.logo = `${origin}/assets/arb-logo.webp`;
  }
  if (types.includes('WebSite')) result.url = `${origin}/`;
  if (types.includes('WebPage')) result.url = canonical;
  return result;
}

function configurePage(html, filename, origin) {
  const canonical = filename === 'index.html' ? `${origin}/` : `${origin}/${filename}`;
  html = setCanonical(html, canonical);
  html = setMeta(html, 'og:url', canonical);
  html = setMeta(html, 'og:image', `${origin}/assets/carbon-hero.webp`);
  html = setMeta(html, 'og:image:alt', 'Koncepcyjna wizualizacja elementu z włókna węglowego');
  html = setMeta(html, 'twitter:card', 'summary_large_image', 'name');
  html = setMeta(html, 'twitter:image', `${origin}/assets/carbon-hero.webp`, 'name');
  html = setMeta(html, 'twitter:image:alt', 'Koncepcyjna wizualizacja elementu z włókna węglowego', 'name');
  return html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (full, tag, text, close) => {
    if (attribute(tag, 'type')?.toLowerCase() !== 'application/ld+json') return full;
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Niepoprawny JSON-LD w ${filename}.`); }
    const updated = JSON.stringify(visitStructuredData(data, origin, canonical)).replace(/</g, '\\u003c');
    return `${tag}${updated}${close}`;
  });
}

function jsonHashes(pages) {
  const hashes = new Set();
  for (const html of pages) {
    for (const match of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi)) {
      if (attribute(match[1], 'type')?.toLowerCase() !== 'application/ld+json') continue;
      // HTML parsing normalizes CRLF/CR to LF before CSP computes inline hashes.
      const text = match[2].replace(/\r\n?/g, '\n');
      hashes.add(`'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`);
    }
  }
  if (!hashes.size) throw new Error('Nie znaleziono danych JSON-LD wymaganych przez konfigurację strony.');
  return [...hashes];
}

function updatePolicy(policy, hashes) {
  let found = false;
  const updated = policy.split(';').map(directive => {
    const tokens = directive.trim().split(/\s+/);
    if (!['script-src', 'script-src-elem'].includes(tokens[0]?.toLowerCase())) return directive.trim();
    found = true;
    const retained = tokens.filter(token => !/^'sha(?:256|384|512)-[a-z0-9+/=]+'$/i.test(token) && token !== "'none'");
    return [...retained, ...hashes].join(' ');
  }).filter(Boolean);
  if (!found) throw new Error('Polityka CSP musi mieć dyrektywę script-src lub script-src-elem.');
  return updated.join('; ');
}

function updateMetaCsp(html, hashes, filename) {
  let found = false;
  const updated = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (attribute(tag, 'http-equiv')?.toLowerCase() !== 'content-security-policy') return tag;
    found = true;
    const policy = attribute(tag, 'content');
    if (!policy) throw new Error(`Pusta polityka CSP w ${filename}.`);
    return `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(updatePolicy(policy, hashes))}">`;
  });
  if (!found) throw new Error(`Brak meta CSP w ${filename}. Przygotuj pełną wersję źródłową strony.`);
  return updated;
}

function updateHeaders(text, hashes, apache) {
  let found = false;
  const pattern = apache
    ? /(^[\t ]*Header\s+(?:always\s+)?set\s+Content-Security-Policy\s+")([^"]*)("[^\r\n]*$)/gmi
    : /(^[\t ]*Content-Security-Policy:\s*)([^\r\n]*)/gmi;
  const updated = text.replace(pattern, (full, start, policy, ending) => {
    found = true;
    return `${start}${updatePolicy(policy, hashes)}${apache ? ending : ''}`;
  });
  if (!found) throw new Error(`Brak nagłówka CSP w ${apache ? '.htaccess' : '_headers'}.`);
  return updated;
}

function synchronizePrivacy(home, privacy) {
  if (!/<dialog\b[^>]*\bid="privacy-sheet"/i.test(home)) return home;
  const content = privacy.match(/<p class="legal-date">[\s\S]*?(?=\s*<p><a href="index\.html#zapytanie">)/)?.[0];
  const markers = /(<!-- privacy-content:start -->)[\s\S]*?(<!-- privacy-content:end -->)/;
  if (!content || !markers.test(home)) throw new Error('Nie można zsynchronizować panelu polityki: brakuje treści lub znaczników privacy-content.');
  const sheet = content.replace(/<(\/?)h2\b/g, '<$1h3')
    .replace(/\bid="([^"]+)"/g, 'id="sheet-$1"')
    .replace(/href="#([^"]+)"/g, 'href="#sheet-$1"');
  return home.replace(markers, (_full, start, end) => `${start}\n${sheet}\n${end}`);
}

function prepareSite(value, sourceDirectory = path.resolve(__dirname, '..')) {
  const origin = validateOrigin(value);
  const source = fs.realpathSync(sourceDirectory);
  const destination = path.join(path.dirname(source), OUTPUT_NAME);
  if (fs.existsSync(destination)) throw new Error(`Folder wynikowy już istnieje: ${destination}. Nie został zmieniony.`);
  const contents = new Map();
  for (const relative of PUBLIC_FILES) {
    const filename = path.join(source, relative);
    const stats = fs.lstatSync(filename);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Wymagany jest zwykły plik: ${relative}.`);
    const actual = fs.realpathSync(filename);
    if (!actual.startsWith(source + path.sep)) throw new Error(`Plik wykracza poza katalog źródłowy: ${relative}.`);
    contents.set(relative, fs.readFileSync(actual));
  }
  contents.set('index.html', synchronizePrivacy(contents.get('index.html').toString('utf8'), contents.get('polityka-prywatnosci.html').toString('utf8')));
  const pages = HTML_FILES.map(filename => configurePage(contents.get(filename).toString('utf8'), filename, origin));
  const hashes = jsonHashes(pages);
  HTML_FILES.forEach((filename, index) => contents.set(filename, updateMetaCsp(pages[index], hashes, filename)));
  contents.set('_headers', updateHeaders(contents.get('_headers').toString('utf8'), hashes, false));
  contents.set('.htaccess', updateHeaders(contents.get('.htaccess').toString('utf8'), hashes, true));
  const robots = contents.get('robots.txt').toString('utf8').replace(/^\s*Sitemap:[^\r\n]*(?:\r?\n)?/gmi, '').trimEnd();
  contents.set('robots.txt', `${robots}\n\nSitemap: ${origin}/sitemap.xml\n`);
  contents.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeAttribute(origin)}/</loc></url>\n  <url><loc>${escapeAttribute(origin)}/polityka-prywatnosci.html</loc></url>\n</urlset>\n`);

  // No file is written until all source files, JSON-LD and CSP policies validate.
  fs.mkdirSync(destination); // EEXIST also protects against a concurrent invocation.
  fs.mkdirSync(path.join(destination, 'assets'));
  for (const [relative, content] of contents) fs.writeFileSync(path.join(destination, relative), content, { flag: 'wx' });
  return { destination, origin, files: [...contents.keys()], hashes };
}

function main(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    process.stdout.write(HELP + '\n');
    return;
  }
  if (args.length !== 1) throw new Error('Podaj jeden origin HTTPS. Opis: node tools/prepare-site.cjs --help');
  const result = prepareSite(args[0]);
  process.stdout.write(`Przygotowano ${result.files.length} plików: ${result.destination}\nDomena: ${result.origin}\nStrona nie została opublikowana.\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`Nie przygotowano strony: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validateOrigin, prepareSite, PUBLIC_FILES, synchronizePrivacy };
