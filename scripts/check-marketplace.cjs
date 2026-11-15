// T2001: checks docs/marketplace/listing.json against Atlassian's listing limits (read 2026-11-15 from developer.atlassian.com
// "Building your presence on Marketplace") and checks every image's exact pixel size. node scripts/check-marketplace.cjs
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '../docs/marketplace'); const L = JSON.parse(fs.readFileSync(dir + '/listing.json', 'utf8'));
let bad = 0; const chk = (what, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + what + ' ' + info); };
const len = (what, s, max) => chk(what, s.length <= max && s.length > 0, `${s.length}/${max}`);
len('app name', L.appName, 60); chk('app name has no banned word', !/atlassian|plugin|beta|add-on|\bapp\b/i.test(L.appName), L.appName);
len('tagline', L.tagline, 130); len('summary', L.summary, 250); len('more details', L.moreDetails, 1000);
L.highlights.forEach((h, i) => { len(`highlight ${i + 1} title`, h.title, 50); len(`highlight ${i + 1} summary`, h.summary, 220); len(`highlight ${i + 1} caption`, h.caption, 220); });
L.extraScreenshots.forEach((e, i) => len(`extra ${i + 1} explanation`, e.explanation, 220));
len('release summary', L.releaseSummary, 80); len('release notes', L.releaseNotes, 1000); len('partner name', L.partner.name, 40); len('partner description', L.partner.description, 750);
const dims = (f) => { const b = fs.readFileSync(path.join(dir, 'assets', f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const size = (f, w, h) => { const [a, b] = dims(f); chk(`image ${f}`, a === w && b === h, `${a}x${b} (need ${w}x${h}, ${fs.statSync(path.join(dir, 'assets', f)).size} bytes)`); };
size('icon-144.png', 144, 144); size('partner-logo-144.png', 144, 144); size('banner-1120x548.png', 1120, 548); size('banner-560x274.png', 560, 274);
L.highlights.forEach((h) => { size(h.screenshot, 1840, 900); size(h.cropped, 580, 330); }); L.extraScreenshots.forEach((e) => size(e.file, 1840, 900));
chk('no vendor or model names in user-facing copy', !/(anthropic|openai|deepseek|claude|gpt)/i.test(JSON.stringify(L)), '');
console.log(bad ? `${bad} problem(s)` : 'all checks passed'); process.exit(bad ? 1 : 0);
