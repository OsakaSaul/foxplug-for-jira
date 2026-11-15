// T2001: renders the Atlassian Marketplace listing images into docs/marketplace/assets/ from the brand files and the mockup shots
// (node scripts/render-marketplace.cjs; needs Playwright: PW_CORE=<path to playwright>). Brand files are copied, never redrawn.
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW_CORE || 'playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/marketplace/assets');
const BRAND = process.env.FOX_BRAND || 'C:/Users/ritekit/lcncagents/brand';
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const icon = uri(path.join(BRAND, 'fox-head-square-512.png'));
const shot = (n) => uri(path.join(root, 'docs/devpost-shots', n));
const CSS = 'body{margin:0;font-family:Segoe UI,Inter,Arial,sans-serif}';
const jobs = [];
const page = (w, h, html, file) => jobs.push({ w, h, html: `<html><style>${CSS}</style><body style="width:${w}px;height:${h}px;overflow:hidden">${html}</body></html>`, file });
page(144, 144, `<img src="${icon}" style="width:144px;height:144px;display:block">`, 'icon-144.png');
page(144, 144, `<img src="${icon}" style="width:144px;height:144px;display:block">`, 'partner-logo-144.png');
const banner = (w, h, k) => `<div style="width:${w}px;height:${h}px;background:linear-gradient(135deg,#0b1020,#1b2347);color:#fff;display:flex;align-items:center;box-sizing:border-box;padding:${64 * k}px"><img src="${icon}" style="width:${150 * k}px;height:${150 * k}px;border-radius:${28 * k}px;margin-right:${44 * k}px"><div><div style="font-size:${64 * k}px;font-weight:800;line-height:1.05">FoxPlug for Jira</div><div style="font-size:${26 * k}px;color:#f7a56a;margin-top:${10 * k}px;font-weight:700">by FoxPlug</div><div style="font-size:${30 * k}px;color:#cfd6f4;margin-top:${22 * k}px;line-height:1.3">Turn the tickets your team closed<br>into a customer update you approve.</div></div></div>`;
page(1120, 548, banner(1120, 548, 1), 'banner-1120x548.png');
page(560, 274, banner(560, 274, 0.5), 'banner-560x274.png');
const hl = (n, shotFile, caption) => {
  page(1840, 900, `<div style="width:1840px;height:900px;background:#0b1020;display:flex;align-items:center;justify-content:center"><img src="${shot(shotFile)}" style="height:900px;width:1440px;box-shadow:0 0 60px rgba(0,0,0,.5)"></div>`, `${n}-1840x900.png`);
  page(580, 330, `<div style="width:580px;height:330px;background:#0b1020;display:flex;align-items:center;justify-content:center"><img src="${shot(shotFile)}" style="height:330px;width:528px"></div>`, `${n}-cropped-580x330.png`);
};
hl('highlight-1-closed-this-week', '01-shipped-this-week.png');
hl('highlight-2-connect-with-a-key', '03-connect-foxplug.png');
hl('highlight-3-draft-you-approve', '06-foxplug-draft.png');
hl('extra-1-nothing-closed', '02-nothing-closed.png');
hl('extra-2-sent', '05-sent.png');
(async () => { const b = await chromium.launch(); for (const j of jobs) { const p = await b.newPage({ viewport: { width: j.w, height: j.h } }); await p.setContent(j.html); await p.waitForTimeout(150); await p.screenshot({ path: path.join(out, j.file) }); await p.close(); console.log(j.file); } await b.close(); })();
