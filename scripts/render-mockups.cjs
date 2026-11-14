// FoxPlug for Jira: the six Devpost screenshot mockups (T1866). Builds assets/mockups/*.html from the app's own words (src/lib.js COPY, so a mockup can never
// say something the app does not) and renders each to assets/screens/*.png with headless Chromium.
//   node scripts/render-mockups.cjs            (needs Playwright: npm i -D playwright elsewhere and point PLAYWRIGHT_DIR at it, or have it resolvable)
// These are MOCKUPS: the real page runs inside a Jira project. Each image says so in its footer line. No third-party logo is used; the one image is FoxPlug's own fox head (assets/fox-head.svg, a copy of the family fox head in brand/).
'use strict';
const fs = require('fs');
const path = require('path');
const { COPY, buildSummary } = require('../src/lib');

const ROOT = path.join(__dirname, '..');
const OUT_HTML = path.join(ROOT, 'assets', 'mockups');
const OUT_PNG = path.join(ROOT, 'assets', 'screens');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ISSUES = [
  ['Story', 'ACME-118', 'Export a report as a CSV file'],
  ['Bug', 'ACME-117', 'Fix the login page on small phones'],
  ['Task', 'ACME-114', 'Add a weekly summary email setting'],
  ['Bug', 'ACME-112', 'Dates in the invoice list show the wrong day'],
  ['Story', 'ACME-109', 'Invite a teammate by email'],
  ['Task', 'ACME-107', 'Speed up the dashboard first load'],
];
const FEED = [
  ['Invite your team by email', 'Nov 6'],
  ['Faster first load on the dashboard', 'Oct 30'],
  ['Dark mode for the invoice list', 'Oct 23'],
  ['Weekly summary, now on by default', 'Oct 16'],
  ['Import from a CSV file', 'Oct 9'],
];

const CSS = `
*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#172B4D;background:#F4F5F7}
.top{height:48px;background:#fff;border-bottom:1px solid #DFE1E6;display:flex;align-items:center;padding:0 20px;gap:18px;color:#42526E}
.top b{color:#172B4D}.wrap{display:flex;min-height:calc(100vh - 48px - 36px)}
.side{width:230px;background:#fff;border-right:1px solid #DFE1E6;padding:16px 0;color:#42526E}
.side div{padding:7px 20px}.side .on{background:#DEEBFF;color:#0747A6;border-left:3px solid #0052CC;padding-left:17px;font-weight:600}
.main{flex:1;padding:24px 36px;max-width:1010px}
h2{font-size:24px;margin:0 0 6px}h3{font-size:16px;margin:0 0 10px}p{margin:0 0 12px}
.cols{display:flex;gap:40px;margin:18px 0 26px}.col{flex:1}
.row{display:flex;gap:10px;align-items:center;margin:0 0 8px}
.loz{background:#DFE1E6;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;padding:1px 6px;color:#42526E;min-width:52px;text-align:center}
.loz.Bug{background:#FFEBE6;color:#BF2600}.loz.Story{background:#E3FCEF;color:#006644}
a{color:#0052CC;text-decoration:none}
.btn{display:inline-block;border-radius:3px;padding:7px 14px;font-weight:600;background:#DFE1E6;color:#172B4D;margin-right:8px}
.btn.pri{background:#0052CC;color:#fff}.btn.off{opacity:.45}
.msg{border-radius:3px;padding:12px 16px;margin:0 0 16px;border-left:4px solid}
.msg.ok{background:#E3FCEF;border-color:#00875A}.msg.warn{background:#FFFAE6;border-color:#FF991F}.msg.err{background:#FFEBE6;border-color:#DE350B}
.help{color:#6B778C;font-size:12px;margin:2px 0 12px}.err-t{color:#DE350B;font-size:12px;margin:2px 0 12px}
label{display:block;font-size:12px;font-weight:700;color:#5E6C84;margin:12px 0 4px}
.field{border:2px solid #DFE1E6;background:#fff;border-radius:3px;padding:7px 10px;width:420px;min-height:34px}.field.bad{border-color:#DE350B}
ol{padding-left:20px;margin:0 0 10px}li{margin:0 0 4px}
.foot{height:36px;display:flex;align-items:center;padding:0 20px;font-size:12px;color:#6B778C;border-top:1px solid #DFE1E6;background:#fff}
.tip{display:inline-block;background:#172B4D;color:#fff;border-radius:3px;padding:6px 10px;font-size:12px;max-width:360px;margin-top:6px}
.fp{background:#0B1020;color:#E2E8F0}.fp .top{background:#111733;border-color:#2a3358;color:#CBD5E1}.fp .top b{color:#fff}
.card{background:#151B3A;border:1px solid #2a3358;border-radius:12px;padding:18px 20px;max-width:780px}
.card h3{color:#fff}.pill{display:inline-block;background:#F27A3A;color:#111733;border-radius:999px;font-size:11px;font-weight:800;padding:2px 10px;margin-bottom:10px}
.fp .btn{background:#2a3358;color:#fff}.fp .btn.pri{background:#F27A3A;color:#111733}.fp .foot{background:#111733;border-color:#2a3358;color:#94A3B8}
`;

function jiraPage(title, bodyHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="top"><b>Jira</b><span>Projects</span><span>Acme Web (ACME)</span></div>
<div class="wrap"><div class="side"><div>Backlog</div><div>Board</div><div>Timeline</div><div class="on">Shipped this week (FoxPlug)</div><div>Project settings</div></div>
<div class="main">${bodyHtml}</div></div>
<div class="foot">Mockup of FoxPlug for Jira. The real page runs inside a Jira project and shows the same words.</div></body></html>`;
}
const issuesHtml = ISSUES.map(([t, k, s]) => `<div class="row"><span class="loz ${t}">${t}</span><span>${esc(k)}: ${esc(s)}</span></div>`).join('');
const feedHtml = FEED.map(([t, d]) => `<div class="row"><a>${esc(t)}</a><span class="help" style="margin:0">${d}</span></div>`).join('');
const head = `<h2>${esc(COPY.title)}</h2><p>${esc(COPY.intro)}</p>`;
const stepsHtml = `<ol>${COPY.connect.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
const field = (label, value, opts = {}) => `<label>${esc(label)}</label><div class="field${opts.bad ? ' bad' : ''}">${esc(value)}</div>${opts.err ? `<div class="err-t">${esc(opts.err)}</div>` : ''}${opts.help ? `<div class="help">${esc(opts.help)}</div>` : ''}`;
const connectPanel = (o = {}) => `<h3>${esc(COPY.connect.heading)}</h3><p>${esc(COPY.connect.intro)}</p>${stepsHtml}<p><a>${esc(COPY.connect.openLabel)}</a> &nbsp;<span class="help">${esc(COPY.connect.keyPage)}</span></p><div class="help">${esc(COPY.connect.safety)}</div>`
  + field('FoxPlug project name', 'Acme Web') + field('Public changelog name (optional)', 'acme') + field(o.hasKey ? 'Agent key (saved; type a new one to replace it)' : 'Agent key', o.keyShown || '••••••••••••••••', { bad: !!o.keyErr, err: o.keyErr, help: o.hasKey && !o.keyErr ? COPY.messages.keepKey : '' })
  + `<span class="btn pri">Save</span><span class="btn">Check the key</span>`;

const summary = buildSummary(ISSUES.map(([, k, s]) => ({ key: k, summary: s })), 'Acme Web');
const PAGES = [
  ['01-shipped-this-week', 'The project page', jiraPage('Shipped this week', `${head}<div class="cols"><div class="col"><h3>Closed in Jira</h3>${issuesHtml}<span class="btn pri">Send to FoxPlug</span><span class="btn">Refresh</span><div class="tip">${esc(COPY.help.send)}</div></div><div class="col"><h3>Already in the FoxPlug changelog</h3>${feedHtml}</div></div>`)],
  ['02-nothing-closed', 'The empty state', jiraPage('Nothing closed', `${head}<div class="cols"><div class="col"><h3>Closed in Jira</h3><p>${esc(COPY.empty.noClosed)}</p><span class="btn pri off">Send to FoxPlug</span><span class="btn">Refresh</span><div class="help">${esc(COPY.messages.nothingToSend)}</div></div><div class="col"><h3>Already in the FoxPlug changelog</h3><p>${esc(COPY.empty.noFeedName)}</p></div></div>`)],
  ['03-connect-foxplug', 'The Connect FoxPlug panel', jiraPage('Connect FoxPlug', connectPanel({ hasKey: false, keyShown: 'fpk_…' }))],
  ['04-bad-key', 'A key FoxPlug did not accept', jiraPage('Bad key', `<div class="msg err">${esc(COPY.messages.badKey)}</div>${connectPanel({ hasKey: true, keyShown: 'fpk_h3llo', keyErr: 'That does not look like a FoxPlug agent key. It starts with fpk_ and is one long word with no spaces. Copy it again from FoxPlug.' })}`)],
  ['05-sent', 'Sent to FoxPlug', jiraPage('Sent', `<div class="msg ok">${esc(COPY.messages.sent)}</div>${head}<div class="cols"><div class="col"><h3>Closed in Jira</h3>${issuesHtml}<span class="btn pri">Send to FoxPlug</span><span class="btn">Refresh</span></div><div class="col"><h3>Already in the FoxPlug changelog</h3>${feedHtml}</div></div>`)],
  ['06-foxplug-draft', 'The work record waiting in FoxPlug', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FoxPlug draft</title><style>${CSS}</style></head><body class="fp">
<div class="top"><img src="../fox-head.svg" alt="FoxPlug" height="26"><b>FoxPlug</b><span>Today</span><span>Acme Web</span></div>
<div class="wrap" style="padding:36px"><div><div class="card"><span class="pill">WORK RECORD · FROM JIRA · DRAFT</span><h3>${esc(summary.split('. ')[0])}.</h3><p style="color:#CBD5E1">${esc(summary.split('. ').slice(1).join('. '))}</p><p class="help" style="color:#94A3B8">Kept as a draft. Nothing is posted until you approve it.</p><span class="btn pri">Approve</span><span class="btn">Edit</span><span class="btn">Skip</span></div></div></div>
<div class="foot">Mockup of the FoxPlug app. A work record from Jira waits as a draft; FoxPlug never posts by itself.</div></body></html>`],
];

async function main() {
  fs.mkdirSync(OUT_HTML, { recursive: true }); fs.mkdirSync(OUT_PNG, { recursive: true });
  for (const [name, , html] of PAGES) fs.writeFileSync(path.join(OUT_HTML, name + '.html'), html);
  console.log(`wrote ${PAGES.length} HTML mockups to assets/mockups/`);
  let pw;
  const tries = [process.env.PLAYWRIGHT_DIR, 'playwright', path.join(ROOT, '..', '..', 'node_modules', 'playwright')].filter(Boolean);
  for (const t of tries) { try { pw = require(t); break; } catch (e) { /* try the next place */ } }
  if (!pw) { console.error('Playwright not found: set PLAYWRIGHT_DIR to a folder that has it, then run this again. The HTML mockups are written.'); process.exit(2); }
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  for (const [name, label] of PAGES) {
    const page = await ctx.newPage();
    await page.goto('file:///' + path.join(OUT_HTML, name + '.html').replace(/\\/g, '/'));
    await page.screenshot({ path: path.join(OUT_PNG, name + '.png') });
    await page.close();
    console.log(`rendered assets/screens/${name}.png (${label})`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
