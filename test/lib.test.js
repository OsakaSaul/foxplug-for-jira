'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const lib = require('../src/lib');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const GOOD_KEY = 'fpk_' + 'EXAMPLE'.repeat(3); // a clearly fake key, built at run time so no key-shaped text sits in this file

// ---- Jira side -------------------------------------------------------------------------------------------------

test('buildJql accepts a project key and clamps the window', () => {
  assert.strictEqual(lib.buildJql('ACME', 7), 'project = "ACME" AND statusCategory = Done AND resolved >= -7d ORDER BY resolved DESC');
  assert.match(lib.buildJql('ACME', 400), /-30d/);
  assert.match(lib.buildJql('ACME', 0), /-7d/);
});

test('buildJql refuses anything that is not a project key (no JQL injection)', () => {
  for (const bad of ['', 'acme', 'AC" OR 1=1', 'A', 'ACME;DROP', undefined]) assert.throws(() => lib.buildJql(bad, 7));
});

test('isProjectKey agrees with buildJql', () => {
  assert.strictEqual(lib.isProjectKey('ACME'), true);
  assert.strictEqual(lib.isProjectKey(' ACME '), true);
  for (const bad of ['', 'acme', 'A', 'AC ME', null, undefined, 'A'.repeat(21)]) assert.strictEqual(lib.isProjectKey(bad), false);
});

test('toShippedItems keeps only key, summary, type, resolved and caps the list', () => {
  const issues = [];
  for (let i = 1; i <= 40; i++) issues.push({ key: 'ACME-' + i, fields: { summary: 'S' + i, issuetype: { name: 'Bug' }, resolutiondate: '2026-11-12T01:00:00.000+0000', assignee: { displayName: 'Secret Name' } } });
  const out = lib.toShippedItems({ issues });
  assert.strictEqual(out.length, lib.MAX_ISSUES);
  assert.deepStrictEqual(Object.keys(out[0]).sort(), ['key', 'resolved', 'summary', 'type']);
  assert.strictEqual(JSON.stringify(out).includes('Secret Name'), false);
  assert.deepStrictEqual(lib.toShippedItems(null), []);
  assert.deepStrictEqual(lib.toShippedItems({ issues: [{ key: 'ACME-1', fields: {} }] }), []);
});

test('toShippedItems survives odd Jira answers (no issues, wrong shapes, long summaries)', () => {
  assert.deepStrictEqual(lib.toShippedItems({}), []);
  assert.deepStrictEqual(lib.toShippedItems({ issues: 'nope' }), []);
  const one = lib.toShippedItems({ issues: [{ key: 'A-1', fields: { summary: 'x'.repeat(500) } }] });
  assert.strictEqual(one[0].summary.length, 160);
  assert.strictEqual(one[0].type, 'Task');
});

test('jiraStatusMessage says what to do for each kind of Jira refusal, with no code in it', () => {
  for (const s of [401, 403, 404, 429, 500, 503, 418, 0]) {
    const m = lib.jiraStatusMessage(s);
    assert.ok(m.length > 20 && m.endsWith('.'), String(s));
    assert.doesNotMatch(m, /\b\d{3}\b|undefined|\[object/i, 'no raw status in what a person reads: ' + m);
  }
  assert.match(lib.jiraStatusMessage(403), /admin/);
  assert.match(lib.jiraStatusMessage(404), /project/);
  assert.match(lib.jiraStatusMessage(429), /minute/);
});

test('buildSummary is built only from keys and summaries', () => {
  const s = lib.buildSummary([{ key: 'ACME-1', summary: 'Fix login' }, { key: 'ACME-2', summary: 'Add export' }], 'Acme');
  assert.strictEqual(s, 'Acme closed 2 issues this week. ACME-1: Fix login; ACME-2: Add export');
  assert.strictEqual(lib.buildSummary([], 'Acme'), '');
  assert.match(lib.buildSummary([{ key: 'A-1', summary: 'x' }], ''), /^The team closed 1 issue this week\./);
  assert.ok(lib.buildSummary(Array(25).fill({ key: 'ACME-1', summary: 'y'.repeat(160) }), 'A').length <= 1800);
});

// ---- FoxPlug side ----------------------------------------------------------------------------------------------

test('recordWorkBody calls record_work with project and summary only', () => {
  const b = lib.recordWorkBody('My Project', 'text');
  assert.strictEqual(b.method, 'tools/call');
  assert.deepStrictEqual(b.params, { name: 'record_work', arguments: { project: 'My Project', summary: 'text' } });
});

test('toolsListBody only asks which tools the key may use', () => {
  assert.deepStrictEqual(lib.toolsListBody(), { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
});

test('parseMcpReply turns every FoxPlug answer into a calm message', () => {
  assert.strictEqual(lib.parseMcpReply(200, { result: { content: [{ text: '{}' }] } }).ok, true);
  assert.match(lib.parseMcpReply(401, null).message, /agent key/);
  assert.match(lib.parseMcpReply(403, null).message, /agent key/);
  assert.match(lib.parseMcpReply(429, null).message, /pause/);
  assert.match(lib.parseMcpReply(500, null).message, /500/);
  assert.strictEqual(lib.parseMcpReply(200, { error: { message: 'bad' } }).message, 'bad');
  assert.strictEqual(lib.parseMcpReply(200, { result: { isError: true, content: [{ text: 'no project' }] } }).message, 'no project');
  assert.strictEqual(lib.parseMcpReply(200, null).ok, false);
});

test('a bad agent key gets the same instruction everywhere: make a new one and paste it again', () => {
  for (const m of [lib.parseMcpReply(401, null).message, lib.parseKeyCheck(401, null).message, lib.COPY.messages.badKey]) {
    assert.match(m, /did not accept this agent key/);
    assert.match(m, /Make a new one/);
  }
});

test('parseKeyCheck: a key FoxPlug accepts answers with the tool list; every other answer is one calm line', () => {
  assert.deepStrictEqual(lib.parseKeyCheck(200, { result: { tools: [{ name: 'record_work' }, { name: 'get_brief' }] } }), { ok: true, message: lib.COPY.messages.keyOk });
  assert.match(lib.parseKeyCheck(200, { result: { tools: [{ name: 'get_brief' }] } }).message, /cannot receive work records/);
  assert.strictEqual(lib.parseKeyCheck(200, { result: {} }).ok, false);
  assert.strictEqual(lib.parseKeyCheck(200, null).ok, false);
  assert.match(lib.parseKeyCheck(429, null).message, /pause/);
  assert.match(lib.parseKeyCheck(502, null).message, /Try again/);
});

test('feedUrl allows only a plain slug; toFeedItems keeps five', () => {
  assert.strictEqual(lib.feedUrl('Foxplug'), 'https://foxplug.com/feed/foxplug.json');
  for (const bad of ['', '../x', 'a/b', 'a b', 'x.json?y=1']) assert.throws(() => lib.feedUrl(bad));
  const items = Array.from({ length: 9 }, (_, i) => ({ title: 'T' + i, url: 'https://foxplug.com/c/' + i, date_published: '2026-11-01' }));
  assert.strictEqual(lib.toFeedItems({ items }).length, 5);
  assert.deepStrictEqual(lib.toFeedItems(null), []);
});

test('feedStatusMessage: a wrong changelog name says so; no raw status', () => {
  assert.match(lib.feedStatusMessage(404), /no public changelog with that name/);
  assert.match(lib.feedStatusMessage(429), /pause/);
  assert.doesNotMatch(lib.feedStatusMessage(500), /\b500\b/);
});

test('isAgentKey follows the rule FoxPlug applies on receipt: fpk_ plus 20 to 80 safe characters', () => {
  assert.strictEqual(lib.isAgentKey(GOOD_KEY), true);
  assert.strictEqual(lib.isAgentKey('fpk_' + 'x'.repeat(80)), true);
  for (const bad of ['', 'abc', 'fpk_', 'fpk_short', 'fpk_abcdefgh12', 'sk_' + 'a'.repeat(30), 'fpk_ab cd efgh ijkl mnop qrst', 'fpk_' + 'x'.repeat(81), null, undefined]) assert.strictEqual(lib.isAgentKey(bad), false, String(bad));
  const keyRule = /fpk_\[A-Za-z0-9_-\]\{20,80\}/;
  assert.match(lib.isAgentKey.toString(), keyRule);
});

// ---- Settings, states, errors ----------------------------------------------------------------------------------

test('validateSettings: a first save needs a project and a key; each problem names its field and its fix', () => {
  const v = lib.validateSettings({ project: '', slug: '', agentKey: '' }, false);
  assert.strictEqual(v.ok, false);
  assert.match(v.errors.project, /name of your FoxPlug project/);
  assert.match(v.errors.agentKey, /agent key/);
});

test('validateSettings: once a key is saved the key box may stay empty (the saved key is kept)', () => {
  const v = lib.validateSettings({ project: 'Acme', slug: '', agentKey: '' }, true);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.clean.agentKey, '');
});

test('validateSettings: a malformed key, slug or project is refused with a plain sentence', () => {
  const v = lib.validateSettings({ project: 'x'.repeat(81), slug: 'a/b', agentKey: 'not a key' }, true);
  assert.strictEqual(v.ok, false);
  assert.match(v.errors.project, /80 characters/);
  assert.match(v.errors.slug, /letters, digits and dashes/);
  assert.match(v.errors.agentKey, /starts with fpk_/);
  assert.strictEqual(lib.validateSettings({ project: 'A\u0007B', agentKey: GOOD_KEY }, false).ok, false);
});

test('validateSettings: a good form passes, trims, and lower-cases the changelog name', () => {
  const v = lib.validateSettings({ project: '  Acme  ', slug: ' Acme-Changes ', agentKey: ' ' + GOOD_KEY + ' ' }, false);
  assert.strictEqual(v.ok, true);
  assert.deepStrictEqual(v.clean, { project: 'Acme', slug: 'acme-changes', agentKey: GOOD_KEY });
});

test('sendBlockedReason explains, in order, why Send is off, and is null when it can go', () => {
  assert.match(lib.sendBlockedReason({ itemCount: 0, hasKey: true, project: 'A', busy: false }), /nothing closed this week/);
  assert.match(lib.sendBlockedReason({ itemCount: 3, hasKey: true, project: '', busy: false }), /name of your FoxPlug project/);
  assert.match(lib.sendBlockedReason({ itemCount: 3, hasKey: false, project: 'A', busy: false }), /agent key/);
  assert.match(lib.sendBlockedReason({ itemCount: 3, hasKey: true, project: 'A', busy: true }), /Sending/);
  assert.strictEqual(lib.sendBlockedReason({ itemCount: 3, hasKey: true, project: 'A', busy: false }), null);
});

test('shippedView has a state for loading, error, empty and rows; the empty state says what to expect', () => {
  assert.strictEqual(lib.shippedView(null).state, 'loading');
  assert.strictEqual(lib.shippedView({ ok: false, message: 'Jira is having trouble right now.' }).text, 'Jira is having trouble right now.');
  assert.strictEqual(lib.shippedView({ ok: true, items: [] }).state, 'empty');
  assert.match(lib.shippedView({ ok: true, items: [] }).text, /last 7 days/);
  assert.strictEqual(lib.shippedView({ ok: true, items: [{ key: 'A-1', summary: 's', type: 'Bug' }] }).state, 'items');
});

test('feedView: no changelog name saved, a name with no entries, an error and rows are four different lines', () => {
  assert.strictEqual(lib.feedView(null, false).state, 'loading');
  assert.match(lib.feedView({ ok: true, items: [] }, false).text, /No public changelog name saved/);
  assert.match(lib.feedView({ ok: true, items: [] }, true).text, /no entries yet/);
  assert.strictEqual(lib.feedView({ ok: false, message: 'm' }, true).state, 'error');
  assert.strictEqual(lib.feedView({ ok: true, items: [{ title: 't', url: 'u' }] }, true).state, 'items');
});

test('friendlyError never lets a stack, a class name or a raw status through', () => {
  const cases = [
    [new TypeError('fetch failed'), 'jira', /Could not reach Jira/],
    [new TypeError('fetch failed'), 'foxplug', /Could not reach FoxPlug/],
    [Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }), 'foxplug', /too long/],
    [new Error('ETIMEDOUT'), 'jira', /too long/],
    [new Error('That is not a Jira project key.'), 'jira', /inside a Jira project/],
    [new Error('That is not a FoxPlug project address name.'), 'foxplug', /letters, digits and dashes/],
    [new Error('storage quota exceeded'), 'app', /could not save/],
    [new Error('Cannot read properties of undefined (reading \'x\')'), 'app', /Something went wrong on our side/],
    [undefined, 'app', /Something went wrong on our side/],
  ];
  for (const [err, where, want] of cases) {
    const m = lib.friendlyError(err, where);
    assert.match(m, want);
    assert.doesNotMatch(m, /TypeError|Cannot read|undefined|ETIMEDOUT|\bat \w+\.|\[object/i);
  }
});

// ---- The words ---------------------------------------------------------------------------------------------------

test('the Connect FoxPlug panel names the exact place the key is made, and every step is plain text', () => {
  const c = lib.COPY.connect;
  assert.strictEqual(c.keyPage, 'https://foxplug.com/app/?connect=plain-key');
  assert.strictEqual(lib.KEY_PAGE, c.keyPage);
  const steps = c.steps.join(' ');
  assert.match(steps, /Make a plain key/);
  assert.match(steps, /Copy key/);
  assert.doesNotMatch(steps, /Make an agent key|Read straight from the AI tool|Integrations/, 'the old steps are gone');
  assert.strictEqual(c.steps.length, 3, 'three short lines');
  for (const st of c.steps) assert.ok(st.split(/\s+/).length <= 22, 'each line is short: ' + st);
  assert.match(c.safety, /Forge secret/);
});

test('no copy names a model, a data source or a method, and none is empty or has a raw code', () => {
  const strings = [];
  (function walk(o) { for (const v of Object.values(o)) { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach((x) => (typeof x === 'string' ? strings.push(x) : walk(x))); else if (v && typeof v === 'object') walk(v); } })(lib.COPY);
  assert.ok(strings.length > 30);
  for (const s of strings) {
    assert.ok(s.trim().length > 3, 'empty copy');
    assert.doesNotMatch(s, /\b(GPT|Claude|Gemini|DeepSeek|Sonnet|Opus|OpenAI|Anthropic|SEC EDGAR|scrape|crawl)\b/i, s);
    assert.doesNotMatch(s, /\b(4\d\d|5\d\d)\b|undefined|null|\[object/, s);
    assert.doesNotMatch(s.replace(/fpk_/g, 'fpk'), /_/, 'no snake_case in what a person reads (only the real key prefix fpk_ may show): ' + s);
  }
});

// ---- The page and the resolver (read as text: the UI Kit cannot run outside Jira) -------------------------------

test('every control on the page has a hover help text, and every help text is used', () => {
  const src = read('src/frontend/index.jsx');
  const controls = (src.match(/<(Button|Textfield)\b/g) || []).length;
  const tips = (src.match(/<Tooltip\b/g) || []).length;
  assert.ok(controls >= 6, 'the page has its buttons and fields');
  assert.ok(tips >= controls, `each control sits in a Tooltip (${tips} tooltips, ${controls} controls)`);
  for (const k of Object.keys(lib.COPY.help)) assert.match(src, new RegExp('COPY\\.help\\.' + k + '\\b'), 'help.' + k + ' is shown on the page');
});

test('the page has a loading line, an error line and an empty line for both columns, and a Connect panel', () => {
  const src = read('src/frontend/index.jsx');
  assert.match(src, /<Spinner\b/);
  assert.match(src, /shippedView\(/);
  assert.match(src, /feedView\(/);
  assert.match(src, /COPY\.connect\.steps/);
  assert.match(src, /KEY_PAGE/);
  assert.match(src, /<ErrorMessage>/);
  assert.match(src, /busy === 'sending'/);
});

test('the key never leaves the resolver: no resolver returns it, nothing logs it, it is stored as a secret', () => {
  const src = read('src/index.js');
  assert.match(src, /kvs.setSecret\(KEY/);
  assert.match(src, /kvs.getSecret\(KEY/);
  assert.doesNotMatch(src, /return\s*\{[^}]*agentKey\s*[,}:]/, 'a result carries the key');
  assert.doesNotMatch(src, /console\.(log|error|warn|info)\([^)]*(agentKey|payload|Bearer)/, 'the key or payload is logged');
  assert.match(src, /hasKey/);
});

test('every resolver is wrapped so a failure comes back as a sentence, and there are seven of them', () => {
  const src = read('src/index.js');
  const defs = src.match(/resolver\.define\('/g) || [];
  const wrapped = src.match(/resolver\.define\('[A-Za-z]+', safe\(/g) || [];
  assert.strictEqual(defs.length, 7);
  assert.strictEqual(wrapped.length, defs.length);
});

// ---- The manifest ------------------------------------------------------------------------------------------------

test('the manifest asks for read access only and one outside address', () => {
  const m = read('manifest.yml');
  assert.match(m, /read:jira-work/);
  assert.doesNotMatch(m, /write:jira-work|manage:jira/);
  assert.match(m, /address: foxplug\.com/);
});

test('the manifest is a UI Kit module (render: native), the one thing the offline validator caught', () => {
  const m = read('manifest.yml');
  assert.match(m, /jira:projectPage:/);
  assert.match(m, /render: native/);
  assert.match(m, /storage:app/);
});

test('the manifest validates offline with the schema package the Forge CLI uses (skipped when that package is not installed)', async (t) => {
  let manifest;
  try { manifest = require('@forge/manifest'); } catch (e) { t.skip('@forge/manifest is not installed'); return; }
  const r = await manifest.validate(false);
  assert.deepStrictEqual((r.errors || []).map((e) => e.reference), [], 'manifest errors');
  assert.strictEqual(r.success, true);
});

test('the project list is read from FoxPlug (get_brief your_projects) and never throws', () => {
  const ok = { result: { isError: false, content: [{ type: 'text', text: JSON.stringify({ ok: true, built: false, your_projects: ['Acme', ' Beta ', ''] }) }] } };
  assert.deepStrictEqual(lib.parseProjects(200, ok), ['Acme', 'Beta']);
  assert.deepStrictEqual(lib.parseProjects(401, ok), []);
  assert.deepStrictEqual(lib.parseProjects(200, null), []);
  assert.deepStrictEqual(lib.parseProjects(200, { result: { content: [{ type: 'text', text: 'not json' }] } }), []);
  assert.strictEqual(lib.projectsBody().params.name, 'get_brief');
  assert.deepStrictEqual(lib.projectsBody().params.arguments, {});
});
